package proxy

import (
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	gatewayauth "github.com/indulgeback/telos/apps/api-gateway/internal/auth"
	"github.com/indulgeback/telos/apps/api-gateway/internal/service"
)

// productionRoutes mirrors cmd/main.go; order must not change which route wins.
var productionRoutes = []RouteConfig{
	{Path: "/workspaces/shares", ServiceName: "agent-service"},
	{Path: "/api/tools", ServiceName: "agent-service"},
	{Path: "/api/skills", ServiceName: "agent-service"},
	{Path: "/api/mcp-servers", ServiceName: "agent-service"},
	{Path: "/api/runs", ServiceName: "agent-service"},
	{Path: "/api/agents", ServiceName: "agent-service", AuthMode: AuthModeRequired},
	{Path: "/api/agent", ServiceName: "agent-service", AuthMode: AuthModeRequired},
}

func TestFindRouteSelectsLongestPrefix(t *testing.T) {
	pm := NewProxyManager(nil, nil)
	pm.LoadRoutes([]RouteConfig{
		{Path: "/api/tools", ServiceName: "tools-svc"},
		{Path: "/api/skills", ServiceName: "skills-svc"},
		{Path: "/api/mcp-servers", ServiceName: "mcp-svc"},
		{Path: "/api/runs", ServiceName: "runs-svc"},
		{Path: "/api/agents", ServiceName: "agents-svc"},
		{Path: "/api/agent", ServiceName: "chat-svc"},
		{Path: "/workspaces/shares", ServiceName: "share-svc"},
	})

	cases := []struct {
		path     string
		service  string
		notFound bool
	}{
		{path: "/api/agents", service: "agents-svc"},
		{path: "/api/agents/abc", service: "agents-svc"},
		{path: "/api/agent/chat/stream", service: "chat-svc"},
		{path: "/api/tools/list", service: "tools-svc"},
		{path: "/workspaces/shares/file.png", service: "share-svc"},
		{path: "/unknown", notFound: true},
	}
	for _, tc := range cases {
		route := pm.findRoute(tc.path)
		if tc.notFound {
			if route != nil {
				t.Fatalf("%q should not match any route, matched %q", tc.path, route.Path)
			}
			continue
		}
		if route == nil || route.ServiceName != tc.service {
			got := "<nil>"
			if route != nil {
				got = route.ServiceName
			}
			t.Fatalf("%q expected %q, got %q", tc.path, tc.service, got)
		}
	}
}

type stubDiscovery struct {
	*service.RegistryServiceDiscovery
	target string
	err    error
	calls  int
}

func (s *stubDiscovery) Discover(serviceName string, keys ...string) (string, error) {
	s.calls++
	if s.err != nil {
		return "", s.err
	}
	return s.target, nil
}

func (s *stubDiscovery) InvalidateCache(serviceName string) {}

func newStubDiscovery(target string) *stubDiscovery {
	base := service.NewRegistryServiceDiscovery("http://127.0.0.1:1", service.NewRoundRobinLoadBalancer())
	return &stubDiscovery{RegistryServiceDiscovery: base, target: target}
}

func newSessionServer(userID string) *httptest.Server {
	body := `{"user":{"id":"` + userID + `"}}`
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(body))
	}))
}

func TestServeHTTPStripsPrefixSanitizesSpoofedIdentityAndSigns(t *testing.T) {
	var mu sync.Mutex
	type backendRequest struct {
		path       string
		header     http.Header
		body       []byte
		query      string
		authHeader string
	}
	var seen backendRequest
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		mu.Lock()
		seen = backendRequest{
			path:       r.URL.Path,
			header:     r.Header.Clone(),
			body:       body,
			query:      r.URL.RawQuery,
			authHeader: r.Header.Get("Authorization"),
		}
		mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer backend.Close()

	session := newSessionServer("user-e2e")
	defer session.Close()

	authenticator := gatewayauth.NewAuthenticator(gatewayauth.Config{
		BetterAuthBaseURL:     session.URL,
		BetterAuthSessionPath: "/get-session",
		GatewayInternalSecret: "e2e-secret",
		CacheTTL:              time.Minute,
	})

	pm := NewProxyManager(newStubDiscovery(backend.URL), authenticator)
	pm.LoadRoutes([]RouteConfig{
		{Path: "/legacy", ServiceName: "agent-service", StripPrefix: true, Timeout: 5, AuthMode: AuthModeRequired},
	})

	req := httptest.NewRequest(http.MethodPost, "/legacy/items?limit=2", strings.NewReader(`{"hello":"world"}`))
	req.Header.Set("Cookie", "telos.session_token=ok")
	req.Header.Set("Authorization", "Bearer internal-token-must-not-leak")
	req.Header.Set("X-User-ID", "attacker")
	req.Header.Set("x-gateway-signature", "forged")

	rec := httptest.NewRecorder()
	pm.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if rec.Body.String() != `{"ok":true}` {
		t.Fatalf("expected backend body to be proxied, got %q", rec.Body.String())
	}

	mu.Lock()
	defer mu.Unlock()
	if seen.path != "/items" {
		t.Fatalf("expected stripped path /items, got %q", seen.path)
	}
	if seen.query != "limit=2" {
		t.Fatalf("expected query to survive forwarding, got %q", seen.query)
	}
	if got := seen.header.Get("X-User-ID"); got != "user-e2e" {
		t.Fatalf("expected signed user id, got %q", got)
	}
	for _, name := range []string{"X-Gateway-Signature", "X-Gateway-Timestamp", "X-Gateway-Nonce"} {
		value := seen.header.Get(name)
		if value == "" || value == "forged" {
			t.Fatalf("expected fresh %q header, got %q", name, value)
		}
	}
	if seen.body == nil || string(seen.body) != `{"hello":"world"}` {
		t.Fatalf("expected intact body after signing restore, got %q", string(seen.body))
	}
	if got := seen.header.Get("X-User-Email"); got != "" {
		t.Fatalf("unexpected forwarded email header %q", got)
	}
}

func TestServeHTTPRejectsRequestsWithoutValidSession(t *testing.T) {
	session := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer session.Close()

	authenticator := gatewayauth.NewAuthenticator(gatewayauth.Config{
		BetterAuthBaseURL:     session.URL,
		BetterAuthSessionPath: "/get-session",
		GatewayInternalSecret: "e2e-secret",
		CacheTTL:              time.Minute,
	})

	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("backend must not receive unauthenticated traffic")
	}))
	defer backend.Close()

	pm := NewProxyManager(newStubDiscovery(backend.URL), authenticator)
	pm.LoadRoutes([]RouteConfig{
		{Path: "/api/agents", ServiceName: "agent-service", AuthMode: AuthModeRequired},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/agents", nil)
	rec := httptest.NewRecorder()
	pm.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "unauthorized") {
		t.Fatalf("expected unauthorized payload, got %q", rec.Body.String())
	}
}

func TestServeHTTPReportsUnknownRoutesAndUnavailableServices(t *testing.T) {
	pm := NewProxyManager(newStubDiscovery(""), nil)
	pm.LoadRoutes([]RouteConfig{
		{Path: "/api/agents", ServiceName: "agent-service", AuthMode: AuthModePublic},
	})

	rec := httptest.NewRecorder()
	pm.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/nope", nil))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for unmatched route, got %d", rec.Code)
	}

	discoveryDown := newStubDiscovery("")
	discoveryDown.err = errors.New("no instance")
	pmUnavailable := NewProxyManager(discoveryDown, nil)
	pmUnavailable.LoadRoutes([]RouteConfig{
		{Path: "/api/agents", ServiceName: "agent-service", AuthMode: AuthModePublic},
	})

	rec = httptest.NewRecorder()
	pmUnavailable.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/agents", nil))
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 when discovery fails, got %d: %s", rec.Code, rec.Body.String())
	}
}
