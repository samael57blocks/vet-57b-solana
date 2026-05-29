package api

import (
	"net/http"

	"github.com/57blocks/vet-57b-backend/internal/models"
	"github.com/go-chi/chi/v5"
)

// AppointmentsResource implements handlers for appointment-related endpoints.
type AppointmentsResource struct {
	q Querier
}

// NewAppointmentsResource creates a new AppointmentsResource with the given Querier.
func NewAppointmentsResource(q Querier) *AppointmentsResource {
	return &AppointmentsResource{q: q}
}

// Routes returns a chi.Router with all appointment endpoints mounted.
func (rs *AppointmentsResource) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", rs.List)
	r.Get("/{id}", rs.Get)
	return r
}

// List handles GET /api/v1/appointments.
// Supports optional ?petId= query parameter to filter by pet.
// Returns 200 with a JSON array (empty array if none).
func (rs *AppointmentsResource) List(w http.ResponseWriter, r *http.Request) {
	petID := r.URL.Query().Get("petId")

	appointments, err := rs.q.ListAppointments(r.Context(), petID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list appointments")
		return
	}

	if appointments == nil {
		appointments = []models.Appointment(nil)
	}
	writeJSON(w, http.StatusOK, appointments)
}

// Get handles GET /api/v1/appointments/{id}.
// Returns 200 with the appointment object, or 404 if not found.
func (rs *AppointmentsResource) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "appointment id is required")
		return
	}

	appointment, err := rs.q.GetAppointment(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get appointment")
		return
	}
	if appointment == nil {
		writeError(w, http.StatusNotFound, "appointment not found")
		return
	}

	writeJSON(w, http.StatusOK, appointment)
}
