package web

import (
	"io/fs"
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"
)

func testDistFS() fs.FS {
	return fstest.MapFS{
		"dist/index.html":            &fstest.MapFile{Data: []byte("<html>test</html>")},
		"dist/favicon.ico":           &fstest.MapFile{Data: []byte("favicon")},
		"dist/assets/test.js":        &fstest.MapFile{Data: []byte("js content")},
		"dist/static/test.css":       &fstest.MapFile{Data: []byte("css content")},
		"dist/locales/en.json":       &fstest.MapFile{Data: []byte(`{"key":"value"}`)},
		"dist/themes/registry.json":  &fstest.MapFile{Data: []byte(`{"themes":[]}`)},
		"dist/themes/default/index.css": &fstest.MapFile{Data: []byte("body{}")},
	}
}

func TestSPAHandler_NewWithEmptyDist(t *testing.T) {
	origFS := DistFS
	DistFS = fs.FS(nil)
	defer func() { DistFS = origFS }()

	handler := NewSPAHandler()
	if !handler.IsEmpty() {
		t.Error("expected handler to be empty with nil DistFS")
	}
}

func TestSPAHandler_NewWithPopulatedDist(t *testing.T) {
	origFS := DistFS
	DistFS = testDistFS()
	defer func() { DistFS = origFS }()

	handler := NewSPAHandler()
	if handler.IsEmpty() {
		t.Error("expected handler to not be empty with populated DistFS")
	}
	if len(handler.indexHTML) == 0 {
		t.Error("expected indexHTML to be loaded")
	}
}

func TestSPAHandler_ServeSPAFallback(t *testing.T) {
	origFS := DistFS
	DistFS = testDistFS()
	defer func() { DistFS = origFS }()

	handler := NewSPAHandler()

	tests := []struct {
		name       string
		path       string
		wantStatus int
		wantHTML   bool
	}{
		{"root returns index.html", "/", 200, true},
		{"SPA route returns index.html", "/watch", 200, true},
		{"SPA deep route returns index.html", "/admin/media", 200, true},
		{"SPA nested route returns index.html", "/channel/my-channel", 200, true},
		{"API route returns JSON 404", "/api/v1/something", 404, false},
		{"Uploads route returns JSON 404", "/uploads/video.mp4", 404, false},
		{"Thumbnails route returns JSON 404", "/thumbnails/thumb.jpg", 404, false},
		{"HLS route returns JSON 404", "/hls/stream.m3u8", 404, false},
		{"Files route returns JSON 404", "/files/thumbnails/abc.jpg", 404, false},
		{"Vite dev client returns JSON 404 (not HTML!)", "/@vite/client", 404, false},
		{"Vite env path returns JSON 404", "/@id/something", 404, false},
		{"Arbitrary .js file returns 404 (not HTML)", "/some-chunk.js", 404, false},
		{"Arbitrary .css file returns 404 (not HTML)", "/random.css", 404, false},
		{"Arbitrary .map file returns 404", "/something.js.map", 404, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", tt.path, nil)
			handler.ServeSPAFallback(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("got status %d, want %d", w.Code, tt.wantStatus)
			}
			if tt.wantHTML {
				ct := w.Header().Get("Content-Type")
				if ct != "text/html; charset=utf-8" {
					t.Errorf("got Content-Type %q, want text/html", ct)
				}
				cc := w.Header().Get("Cache-Control")
				if cc != "no-cache" {
					t.Errorf("got Cache-Control %q, want no-cache", cc)
				}
			} else {
				ct := w.Header().Get("Content-Type")
				if ct != "application/json; charset=utf-8" {
					t.Errorf("got Content-Type %q, want JSON", ct)
				}
			}
		})
	}
}

func TestSPAHandler_ServeStatic(t *testing.T) {
	origFS := DistFS
	DistFS = testDistFS()
	defer func() { DistFS = origFS }()

	handler := NewSPAHandler()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/assets/test.js", nil)
	handler.ServeStatic(w, req, "/assets", "public, max-age=31536000, immutable")

	cc := w.Header().Get("Cache-Control")
	if cc != "public, max-age=31536000, immutable" {
		t.Errorf("got Cache-Control %q, want immutable", cc)
	}
}

func TestSPAHandler_ServeRootFile(t *testing.T) {
	origFS := DistFS
	DistFS = testDistFS()
	defer func() { DistFS = origFS }()

	handler := NewSPAHandler()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/favicon.ico", nil)
	handler.ServeRootFile(w, req, "/favicon.ico")

	if w.Code != 200 {
		t.Errorf("got status %d, want 200", w.Code)
	}
}

func TestIsStaticAssetPath(t *testing.T) {
	tests := []struct {
		path string
		want bool
	}{
		{"/assets/test.js", true},
		{"/static/test.css", true},
		{"/locales/en.json", true},
		{"/themes/registry.json", true},
		{"/themes/default/index.css", true},
		{"/api/v1/test", false},
		{"/watch", false},
		{"/favicon.ico", false},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			if got := IsStaticAssetPath(tt.path); got != tt.want {
				t.Errorf("IsStaticAssetPath(%q) = %v, want %v", tt.path, got, tt.want)
			}
		})
	}
}

func TestIsAPIPath(t *testing.T) {
	tests := []struct {
		path string
		want bool
	}{
		{"/api/v1/test", true},
		{"/uploads/video.mp4", true},
		{"/thumbnails/thumb.jpg", true},
		{"/hls/stream.m3u8", true},
		{"/files/thumbnails/abc.jpg", true},
		{"/@vite/client", true},
		{"/watch", false},
		{"/assets/test.js", false},
		{"/themes/registry.json", false},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			if got := IsAPIPath(tt.path); got != tt.want {
				t.Errorf("IsAPIPath(%q) = %v, want %v", tt.path, got, tt.want)
			}
		})
	}
}

func TestIsRootFile(t *testing.T) {
	tests := []struct {
		path string
		want bool
	}{
		{"/favicon.ico", true},
		{"/robots.txt", true},
		{"/manifest.json", true},
		{"/logo.svg", true},
		{"/logo-16.png", true},
		{"/logo-32.png", true},
		{"/logo-48.png", true},
		{"/logo-64.png", true},
		{"/logo-128.png", true},
		{"/logo-192.png", true},
		{"/logo-256.png", true},
		{"/logo-512.png", true},
		{"/logo-1024.png", true},
		{"/banner.svg", true},
		{"/banner.png", true},
		{"/other.png", false},
		{"/index.html", false},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			if got := IsRootFile(tt.path); got != tt.want {
				t.Errorf("IsRootFile(%q) = %v, want %v", tt.path, got, tt.want)
			}
		})
	}
}

func TestRegisterStdRoutes(t *testing.T) {
	origFS := DistFS
	DistFS = testDistFS()
	defer func() { DistFS = origFS }()

	mux := http.NewServeMux()
	RegisterStdRoutes(mux)

	server := httptest.NewServer(mux)
	defer server.Close()

	resp, err := http.Get(server.URL + "/favicon.ico")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Errorf("favicon.ico: got status %d, want 200", resp.StatusCode)
	}

	resp, err = http.Get(server.URL + "/watch")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Errorf("SPA fallback: got status %d, want 200", resp.StatusCode)
	}
	ct := resp.Header.Get("Content-Type")
	if ct != "text/html; charset=utf-8" {
		t.Errorf("SPA fallback: got Content-Type %q, want text/html", ct)
	}
}
