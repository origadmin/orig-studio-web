package web

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	handler := NewSPAHandler()
	if handler.IsEmpty() {
		return
	}

	for _, route := range DefaultStaticRoutes {
		prefix := route.Prefix
		cc := route.CacheControl
		r.GET(prefix+"/*filepath", func(c *gin.Context) {
			c.Header("Cache-Control", cc)
			c.Request.URL.Path = prefix + c.Param("filepath")
			handler.fileServer.ServeHTTP(c.Writer, c.Request)
		})
	}

	for _, name := range DefaultRootFiles {
		n := name
		r.GET(n, func(c *gin.Context) {
			handler.ServeRootFile(c.Writer, c.Request, n)
		})
	}

	r.NoRoute(func(c *gin.Context) {
		handler.ServeSPAFallback(c.Writer, c.Request)
	})
}

func RegisterGinRoutesWithHandler(r *gin.Engine, handler *SPAHandler) {
	if handler.IsEmpty() {
		return
	}

	for _, route := range DefaultStaticRoutes {
		prefix := route.Prefix
		cc := route.CacheControl
		r.GET(prefix+"/*filepath", func(c *gin.Context) {
			c.Header("Cache-Control", cc)
			c.Request.URL.Path = prefix + c.Param("filepath")
			handler.fileServer.ServeHTTP(c.Writer, c.Request)
		})
	}

	for _, name := range DefaultRootFiles {
		n := name
		r.GET(n, func(c *gin.Context) {
			handler.ServeRootFile(c.Writer, c.Request, n)
		})
	}

	r.NoRoute(func(c *gin.Context) {
		handler.ServeSPAFallback(c.Writer, c.Request)
	})
}

func RegisterStdRoutes(mux *http.ServeMux) {
	handler := NewSPAHandler()
	if handler.IsEmpty() {
		return
	}

	for _, route := range DefaultStaticRoutes {
		prefix := route.Prefix
		cc := route.CacheControl
		mux.Handle(prefix+"/", http.StripPrefix(prefix, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Cache-Control", cc)
			handler.fileServer.ServeHTTP(w, r)
		})))
	}

	for _, name := range DefaultRootFiles {
		n := name
		mux.HandleFunc(n, func(w http.ResponseWriter, r *http.Request) {
			handler.ServeRootFile(w, r, n)
		})
	}

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" || (!IsAPIPath(r.URL.Path) && !IsStaticAssetPath(r.URL.Path) && !IsRootFile(r.URL.Path)) {
			handler.ServeSPAFallback(w, r)
			return
		}
		handler.fileServer.ServeHTTP(w, r)
	})
}
