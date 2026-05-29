package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
)

// NewRouter creates and returns a chi HTTP handler with all API routes mounted.
//
// Middleware stack:
//   - Request logging (chi built-in Logger)
//   - Panic recovery (chi built-in Recoverer)
//   - JSON Content-Type header on every response
//
// Routes:
//   GET /health                     → {"status":"ok"}
//   GET /api/v1/pets                → [{...}]
//   GET /api/v1/pets/{id}           → {...}
//   GET /api/v1/pets/{id}/checkins  → [{...}]
//   GET /api/v1/appointments        → [{...}]
//   GET /api/v1/appointments/{id}   → {...}
func NewRouter(q Querier) http.Handler {
	r := chi.NewRouter()

	// Middleware
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(jsonContentType)

	// Health endpoint (outside /api/v1)
	r.Get("/health", Health)

	// API v1 routes
	r.Route("/api/v1", func(r chi.Router) {
		r.Mount("/pets", NewPetsResource(q).Routes())
		r.Mount("/appointments", NewAppointmentsResource(q).Routes())
	})

	return r
}

// Health responds with 200 {"status":"ok"}.
// Used by Docker healthcheck and load balancer probes.
func Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// jsonContentType sets the Content-Type header to application/json on every
// response. Individual handlers only need to write the body.
func jsonContentType(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		next.ServeHTTP(w, r)
	})
}