package auth

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
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
	return &Authenticator{
		cfg: cfg,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
		cache: make(map[string]cacheEntry),
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

func (a *Authenticator) Sign(method string, path string, userID string) (timestamp string, nonce string, signature string, err error) {
	timestamp = fmt.Sprintf("%d", time.Now().Unix())
	nonce, err = randomNonce()
	if err != nil {
		return "", "", "", err
	}
	signature = Sign(a.cfg.GatewayInternalSecret, method, path, userID, timestamp, nonce)
	return timestamp, nonce, signature, nil
}

func Sign(secret string, method string, path string, userID string, timestamp string, nonce string) string {
	payload := strings.Join([]string{method, path, userID, timestamp, nonce}, "\n")
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	return hex.EncodeToString(mac.Sum(nil))
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
	a.cache[key] = cacheEntry{
		userID:    identity.UserID,
		expiresAt: time.Now().Add(a.cfg.CacheTTL),
	}
	a.mu.Unlock()
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
