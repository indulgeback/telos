package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestRateLimitMiddlewareBlocksBurstThenRecovers(t *testing.T) {
	var handled atomic.Int64
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handled.Add(1)
		w.WriteHeader(http.StatusOK)
	})

	server := httptest.NewServer(RateLimitMiddleware(2, 80*time.Millisecond)(next))
	defer server.Close()

	getStatus := func(ip string) int {
		req, _ := http.NewRequest(http.MethodGet, server.URL, nil)
		if ip != "" {
			req.Header.Set("X-Forwarded-For", ip)
		}
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer resp.Body.Close()
		return resp.StatusCode
	}

	if code := getStatus(""); code != http.StatusOK {
		t.Fatalf("first request should pass, got %d", code)
	}
	if code := getStatus(""); code != http.StatusOK {
		t.Fatalf("second request should pass, got %d", code)
	}
	if code := getStatus(""); code != http.StatusTooManyRequests {
		t.Fatalf("third same-IP request should be limited, got %d", code)
	}

	// A different keyed client must not consume the exhausted bucket.
	if code := getStatus("203.0.113.7"); code != http.StatusOK {
		t.Fatalf("different IP should not be affected, got %d", code)
	}

	time.Sleep(90 * time.Millisecond)
	if code := getStatus(""); code != http.StatusOK {
		t.Fatalf("same IP should recover after the window, got %d", code)
	}
}

func TestCORSMiddleware(t *testing.T) {
	requestWithOrigin := func(origin string, method string) *http.Request {
		req := httptest.NewRequest(method, "/ping", nil)
		req.Header.Set("Origin", origin)
		return req
	}

	t.Run("wildcard echoes origin with credentials", func(t *testing.T) {
		handler := CORSMiddleware([]string{"*"})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, requestWithOrigin("https://app.example.com", http.MethodGet))

		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "https://app.example.com" {
			t.Fatalf("expected echoed origin, got %q", got)
		}
		if rec.Header().Get("Access-Control-Allow-Credentials") != "true" {
			t.Fatal("credentials must stay enabled for the wildcard config")
		}
	})

	t.Run("explicit list only allows listed origins", func(t *testing.T) {
		called := false
		downstream := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called = true })
		handler := CORSMiddleware([]string{"https://allowed.example.com"})(downstream)

		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, requestWithOrigin("https://allowed.example.com", http.MethodGet))
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "https://allowed.example.com" || !called {
			t.Fatalf("listed origin should pass through with ACAO header, got %q called=%v", got, called)
		}

		called = false
		rec = httptest.NewRecorder()
		handler.ServeHTTP(rec, requestWithOrigin("https://evil.example.com", http.MethodGet))
		if rec.Header().Get("Access-Control-Allow-Origin") != "" {
			t.Fatal("unlisted origin must not receive an ACAO header")
		}
		if !called {
			t.Fatal("request without CORS grant should still reach downstream")
		}
	})

	t.Run("preflight requests short-circuit before downstream", func(t *testing.T) {
		called := false
		downstream := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called = true })
		handler := CORSMiddleware([]string{"*"})(downstream)

		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, requestWithOrigin("https://app.example.com", http.MethodOptions))

		if rec.Code != http.StatusOK {
			t.Fatalf("preflight should return 200, got %d", rec.Code)
		}
		if called {
			t.Fatal("preflight must not invoke the wrapped handler")
		}
		if got := rec.Header().Get("Access-Control-Allow-Methods"); !strings.Contains(got, http.MethodPatch) {
			t.Fatalf("clarification and plan decisions require PATCH, got %q", got)
		}
	})
}

func TestGetClientIPPrefersForwardedHeaders(t *testing.T) {
	cases := []struct {
		name     string
		headers  map[string]string
		expected string
	}{
		{
			name:     "x-forwarded-for wins",
			headers:  map[string]string{"X-Forwarded-For": "198.51.100.9, 10.0.0.1"},
			expected: "198.51.100.9",
		},
		{
			name:     "x-real-ip used without x-forwarded-for",
			headers:  map[string]string{"X-Real-IP": "203.0.113.4"},
			expected: "203.0.113.4",
		},
		{
			name:     "falls back to remote address",
			headers:  map[string]string{},
			expected: "192.0.2.1:5555",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.RemoteAddr = "192.0.2.1:5555"
			for name, value := range tc.headers {
				req.Header.Set(name, value)
			}
			if got := getClientIP(req); got != tc.expected {
				t.Fatalf("expected %q, got %q", tc.expected, got)
			}
		})
	}
}
