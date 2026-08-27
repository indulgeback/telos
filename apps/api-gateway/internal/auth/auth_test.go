package auth

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestAuthenticateReturnsUserFromBetterAuthSession(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Cookie"); got != "telos.session_token=ok" {
			t.Fatalf("expected cookie to be forwarded, got %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"session":{"id":"session-1"},"user":{"id":"user-1"}}`))
	}))
	defer server.Close()

	authenticator := NewAuthenticator(Config{
		BetterAuthBaseURL:     server.URL,
		BetterAuthSessionPath: "/get-session",
		GatewayInternalSecret: "test-secret",
		CacheTTL:              time.Minute,
	})

	identity, err := authenticator.Authenticate(context.Background(), "telos.session_token=ok")
	if err != nil {
		t.Fatalf("expected authenticate to succeed: %v", err)
	}
	if identity.UserID != "user-1" {
		t.Fatalf("expected user-1, got %q", identity.UserID)
	}
}

func TestAuthenticateRejectsMissingCookie(t *testing.T) {
	authenticator := NewAuthenticator(Config{})
	_, err := authenticator.Authenticate(context.Background(), "")
	if !errors.Is(err, ErrUnauthorized) {
		t.Fatalf("expected ErrUnauthorized, got %v", err)
	}
}

func TestAuthenticateCachesUserIDByCookie(t *testing.T) {
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"user":{"id":"cached-user"}}`))
	}))
	defer server.Close()

	authenticator := NewAuthenticator(Config{
		BetterAuthBaseURL:     server.URL,
		BetterAuthSessionPath: "/get-session",
		GatewayInternalSecret: "test-secret",
		CacheTTL:              time.Minute,
	})

	for i := 0; i < 2; i++ {
		identity, err := authenticator.Authenticate(context.Background(), "telos.session_token=cache")
		if err != nil {
			t.Fatalf("expected authenticate to succeed: %v", err)
		}
		if identity.UserID != "cached-user" {
			t.Fatalf("expected cached-user, got %q", identity.UserID)
		}
	}
	if calls != 1 {
		t.Fatalf("expected one Better Auth call, got %d", calls)
	}
}

func TestSignMatchesGatewayPayloadContract(t *testing.T) {
	digest := DigestBody(nil)
	canonical, err := CanonicalRequest("get", "/api/agent/threads", "q=hello+world&tag=b&tag=a", digest, "user-1", "100", "nonce")
	if err != nil {
		t.Fatal(err)
	}
	expectedCanonical := "GET\n/api/agent/threads\nq=hello%20world&tag=a&tag=b\n" + digest + "\nuser-1\n100\nnonce"
	if canonical != expectedCanonical {
		t.Fatalf("expected canonical request %q, got %q", expectedCanonical, canonical)
	}
	signature, err := Sign("secret", "GET", "/api/agent/threads", "tag=b&q=hello+world&tag=a", digest, "user-1", "100", "nonce")
	if err != nil {
		t.Fatal(err)
	}
	if len(signature) != 64 {
		t.Fatalf("expected SHA-256 signature, got %q", signature)
	}
}
