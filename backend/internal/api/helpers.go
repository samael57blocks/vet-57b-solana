package api

import (
	"encoding/json"
	"net/http"
)

// writeJSON encodes v as JSON and writes it with the given status code.
// The Content-Type header is already set by the JSONContentType middleware.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// writeError writes a JSON error response with the given status code and message.
// Format: {"error": "message"}
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
