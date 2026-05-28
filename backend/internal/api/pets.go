package api

import (
	"net/http"

	"github.com/57blocks/vet-57b-backend/internal/models"
	"github.com/go-chi/chi/v5"
)

// PetsResource implements handlers for pet-related endpoints.
type PetsResource struct {
	q Querier
}

// NewPetsResource creates a new PetsResource with the given Querier.
func NewPetsResource(q Querier) *PetsResource {
	return &PetsResource{q: q}
}

// Routes returns a chi.Router with all pet endpoints mounted.
func (rs *PetsResource) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", rs.List)
	r.Get("/{id}/checkins", rs.Checkins)
	r.Get("/{id}", rs.Get)
	return r
}

// List handles GET /api/v1/pets.
// Returns 200 with a JSON array of all pets (empty array if none).
func (rs *PetsResource) List(w http.ResponseWriter, r *http.Request) {
	pets, err := rs.q.ListPets(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list pets")
		return
	}

	if pets == nil {
		pets = []models.Pet(nil)
	}
	writeJSON(w, http.StatusOK, pets)
}

// Get handles GET /api/v1/pets/{id}.
// Returns 200 with the pet object, or 404 if not found.
func (rs *PetsResource) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "pet id is required")
		return
	}

	pet, err := rs.q.GetPet(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get pet")
		return
	}
	if pet == nil {
		writeError(w, http.StatusNotFound, "pet not found")
		return
	}

	writeJSON(w, http.StatusOK, pet)
}

// Checkins handles GET /api/v1/pets/{id}/checkins.
// Returns 200 with a JSON array of checkins (empty if none), or 404 if the
// pet does not exist.
func (rs *PetsResource) Checkins(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "pet id is required")
		return
	}

	// First check if the pet exists.
	exists, err := rs.q.PetExists(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to check pet existence")
		return
	}
	if !exists {
		writeError(w, http.StatusNotFound, "pet not found")
		return
	}

	checkins, err := rs.q.ListCheckins(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list checkins")
		return
	}

	if checkins == nil {
		checkins = []models.Checkin(nil)
	}
	writeJSON(w, http.StatusOK, checkins)
}


