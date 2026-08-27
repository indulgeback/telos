package auth

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"
)

var ErrUnauthorized = errors.New("unauthorized")

type Config struct {
	BetterAuthBaseURL     string
	BetterAuthSessionPath string
	GatewayInternalSecret string
	CacheTTL              time.Duration
	ClockSkew             time.Duration
	BodyMaxBytes          int64
}

type Identity struct {
	UserID string
}

type Authenticator struct {
	cfg    Config
	client *http.Client
	cache  map[string]cacheEntry
	mu     sync.RWMutex
}

func (a *Authenticator) BodyMaxBytes() int64 {
	if a.cfg.BodyMaxBytes > 0 {
		return a.cfg.BodyMaxBytes
	}
	return 10 << 20
}

type cacheEntry struct {
	userID    string
	expiresAt time.Time
}

type sessionResponse struct {
	User *struct {
		ID string `json:"id"`
	} `json:"user"`
	Data *struct {
		User *struct {
			ID string `json:"id"`
		} `json:"user"`
	} `json:"data"`
}

func NewAuthenticator(cfg Config) *Authenticator {
	a := &Authenticator{
		cfg: cfg,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
		cache: make(map[string]cacheEntry),
	}
	go a.cleanupLoop()
	return a
}

func (a *Authenticator) cleanupLoop() {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		a.mu.Lock()
		now := time.Now()
		for k, entry := range a.cache {
			if now.After(entry.expiresAt) {
				delete(a.cache, k)
			}
		}
		a.mu.Unlock()
	}
}

func (a *Authenticator) Authenticate(ctx context.Context, cookieHeader string) (*Identity, error) {
	cookieHeader = strings.TrimSpace(cookieHeader)
	if cookieHeader == "" {
		return nil, ErrUnauthorized
	}

	cacheKey := hashString(cookieHeader)
	if identity := a.getCached(cacheKey); identity != nil {
		return identity, nil
	}

	sessionURL, err := a.sessionURL()
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, sessionURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Cookie", cookieHeader)
	req.Header.Set("Accept", "application/json")

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, ErrUnauthorized
	}

	var payload sessionResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, ErrUnauthorized
	}

	userID := ""
	if payload.User != nil {
		userID = payload.User.ID
	}
	if userID == "" && payload.Data != nil && payload.Data.User != nil {
		userID = payload.Data.User.ID
	}
	if strings.TrimSpace(userID) == "" {
		return nil, ErrUnauthorized
	}

	identity := &Identity{UserID: strings.TrimSpace(userID)}
	a.setCached(cacheKey, identity)
	return identity, nil
}

func (a *Authenticator) Sign(method string, path string, rawQuery string, body []byte, userID string) (timestamp string, nonce string, signature string, bodyDigest string, err error) {
	timestamp = fmt.Sprintf("%d", time.Now().Unix())
	nonce, err = randomNonce()
	if err != nil {
		return "", "", "", "", err
	}
	bodyDigest = DigestBody(body)
	signature, err = Sign(a.cfg.GatewayInternalSecret, method, path, rawQuery, bodyDigest, userID, timestamp, nonce)
	return timestamp, nonce, signature, bodyDigest, err
}

// Sign computes the canonical gateway request signature. The canonical request
// binds every value that can alter the downstream request, including the
// normalized query string and raw request body digest.
func Sign(secret string, method string, path string, rawQuery string, bodyDigest string, userID string, timestamp string, nonce string) (string, error) {
	canonical, err := CanonicalRequest(method, path, rawQuery, bodyDigest, userID, timestamp, nonce)
	if err != nil {
		return "", err
	}
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(canonical))
	return hex.EncodeToString(mac.Sum(nil)), nil
}

// DigestBody returns the lowercase SHA-256 digest used in the signing
// protocol. The digest is over the exact bytes sent through the gateway.
func DigestBody(body []byte) string {
	sum := sha256.Sum256(body)
	return hex.EncodeToString(sum[:])
}

// BodyDigest reads and restores an incoming request body so signing does not
// consume it before ReverseProxy or the streaming client sees it.
func BodyDigest(r *http.Request, maxBytes int64) (string, error) {
	if r.Body == nil {
		return DigestBody(nil), nil
	}
	if maxBytes <= 0 {
		maxBytes = 10 << 20
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, maxBytes+1))
	if err != nil {
		return "", err
	}
	r.Body = io.NopCloser(bytes.NewReader(body))
	if int64(len(body)) > maxBytes {
		return "", fmt.Errorf("request body exceeds signing limit")
	}
	return DigestBody(body), nil
}

// CanonicalRequest is intentionally implemented without url.Values so the Go
// gateway and Node service agree on RFC3986 encoding, including spaces and
// repeated query parameters.
func CanonicalRequest(method string, path string, rawQuery string, bodyDigest string, userID string, timestamp string, nonce string) (string, error) {
	canonicalPath, err := CanonicalPath(path)
	if err != nil {
		return "", err
	}
	canonicalQuery, err := CanonicalQuery(rawQuery)
	if err != nil {
		return "", err
	}
	return strings.Join([]string{
		strings.ToUpper(strings.TrimSpace(method)),
		canonicalPath,
		canonicalQuery,
		strings.ToLower(strings.TrimSpace(bodyDigest)),
		strings.TrimSpace(userID),
		strings.TrimSpace(timestamp),
		strings.TrimSpace(nonce),
	}, "\n"), nil
}

func CanonicalPath(path string) (string, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		path = "/"
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	segments := strings.Split(path, "/")
	for i, segment := range segments {
		decoded, err := url.PathUnescape(segment)
		if err != nil {
			return "", err
		}
		segments[i] = rfc3986Encode(decoded)
	}
	return strings.Join(segments, "/"), nil
}

func CanonicalQuery(rawQuery string) (string, error) {
	if rawQuery == "" {
		return "", nil
	}
	pairs := make([]string, 0)
	for _, rawPair := range strings.Split(rawQuery, "&") {
		if rawPair == "" {
			continue
		}
		parts := strings.SplitN(rawPair, "=", 2)
		key, err := url.QueryUnescape(parts[0])
		if err != nil {
			return "", err
		}
		value := ""
		if len(parts) == 2 {
			value, err = url.QueryUnescape(parts[1])
			if err != nil {
				return "", err
			}
		}
		pairs = append(pairs, rfc3986Encode(key)+"="+rfc3986Encode(value))
	}
	sort.Strings(pairs)
	return strings.Join(pairs, "&"), nil
}

func rfc3986Encode(value string) string {
	encoded := url.QueryEscape(value)
	return strings.ReplaceAll(encoded, "+", "%20")
}

func (a *Authenticator) sessionURL() (string, error) {
	baseURL, err := url.Parse(a.cfg.BetterAuthBaseURL)
	if err != nil {
		return "", err
	}
	path := a.cfg.BetterAuthSessionPath
	if path == "" {
		path = "/api/auth/get-session"
	}
	baseURL.Path = strings.TrimRight(baseURL.Path, "/") + "/" + strings.TrimLeft(path, "/")
	query := baseURL.Query()
	query.Set("disableRefresh", "true")
	baseURL.RawQuery = query.Encode()
	return baseURL.String(), nil
}

func (a *Authenticator) getCached(key string) *Identity {
	if a.cfg.CacheTTL <= 0 {
		return nil
	}
	a.mu.RLock()
	entry, ok := a.cache[key]
	a.mu.RUnlock()
	if !ok || time.Now().After(entry.expiresAt) {
		if ok {
			a.mu.Lock()
			delete(a.cache, key)
			a.mu.Unlock()
		}
		return nil
	}
	return &Identity{UserID: entry.userID}
}

func (a *Authenticator) setCached(key string, identity *Identity) {
	if a.cfg.CacheTTL <= 0 {
		return
	}
	a.mu.Lock()
	defer a.mu.Unlock()

	if len(a.cache) >= 10000 {
		now := time.Now()
		for k, entry := range a.cache {
			if now.After(entry.expiresAt) {
				delete(a.cache, k)
			}
		}
		if len(a.cache) >= 10000 {
			count := 0
			for k := range a.cache {
				delete(a.cache, k)
				count++
				if count >= 1000 {
					break
				}
			}
		}
	}

	a.cache[key] = cacheEntry{
		userID:    identity.UserID,
		expiresAt: time.Now().Add(a.cfg.CacheTTL),
	}
}

func hashString(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func randomNonce() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
