package web

import (
	"io/fs"
	"net/http"
	"strings"
)

type SPAHandler struct {
	fileServer http.Handler
	indexHTML  []byte
	indexErr   error
	sub        fs.FS
}

func NewSPAHandler() *SPAHandler {
	if IsDistEmpty() {
		return &SPAHandler{}
	}

	sub, err := fs.Sub(DistFS, "dist")
	if err != nil {
		return &SPAHandler{}
	}

	indexHTML, indexErr := fs.ReadFile(sub, "index.html")
	if indexErr == nil {
		indexHTML = []byte(strings.ReplaceAll(string(indexHTML), `<script type="module" src="/src/index.tsx"></script>`, ""))
	}

	return &SPAHandler{
		fileServer: http.FileServer(http.FS(sub)),
		indexHTML:  indexHTML,
		indexErr:   indexErr,
		sub:        sub,
	}
}

func (h *SPAHandler) IsEmpty() bool {
	return h.fileServer == nil
}

func (h *SPAHandler) ServeStatic(w http.ResponseWriter, r *http.Request, prefix string, cacheControl string) {
	w.Header().Set("Cache-Control", cacheControl)
	r.URL.Path = prefix + strings.TrimPrefix(r.URL.Path, prefix)
	h.fileServer.ServeHTTP(w, r)
}

func (h *SPAHandler) ServeRootFile(w http.ResponseWriter, r *http.Request, name string) {
	r.URL.Path = name
	h.fileServer.ServeHTTP(w, r)
}

func (h *SPAHandler) ServeSPAFallback(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	if strings.HasPrefix(path, "/api/") ||
		strings.HasPrefix(path, "/uploads/") ||
		strings.HasPrefix(path, "/thumbnails/") ||
		strings.HasPrefix(path, "/hls/") {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"error":"not found"}`))
		return
	}

	w.Header().Set("Cache-Control", "no-cache")
	if h.indexErr != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("index.html not found in embedded frontend"))
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write(h.indexHTML)
}

type StaticRoute struct {
	Prefix       string
	CacheControl string
}

var DefaultStaticRoutes = []StaticRoute{
	{Prefix: "/assets", CacheControl: "public, max-age=31536000, immutable"},
	{Prefix: "/locales", CacheControl: "public, max-age=3600"},
	{Prefix: "/static", CacheControl: "public, max-age=86400"},
}

var DefaultRootFiles = []string{
	"/favicon.ico",
	"/robots.txt",
	"/manifest.json",
	"/logo.svg",
	"/logo-16.png",
	"/logo-32.png",
	"/logo-48.png",
	"/logo-64.png",
	"/logo-128.png",
	"/logo-192.png",
	"/logo-256.png",
	"/logo-512.png",
	"/logo-1024.png",
	"/banner.svg",
	"/banner.png",
}

func IsDistEmpty() bool {
	if DistFS == nil {
		return true
	}
	entries, err := fs.ReadDir(DistFS, "dist")
	return err != nil || len(entries) == 0
}

func IsStaticAssetPath(path string) bool {
	for _, prefix := range []string{"/assets/", "/static/", "/locales/"} {
		if strings.HasPrefix(path, prefix) {
			return true
		}
	}
	return false
}

func IsAPIPath(path string) bool {
	return strings.HasPrefix(path, "/api/") ||
		strings.HasPrefix(path, "/uploads/") ||
		strings.HasPrefix(path, "/thumbnails/") ||
		strings.HasPrefix(path, "/hls/")
}

func IsRootFile(path string) bool {
	for _, f := range DefaultRootFiles {
		if path == f {
			return true
		}
	}
	return false
}
