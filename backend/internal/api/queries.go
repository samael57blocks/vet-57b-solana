// Package api provides the REST API layer for the vet-57b backend.
//
// It defines a Querier interface that abstracts database access, making
// handlers testable with mock implementations. The chi router mounts all
// endpoints and applies standard middleware (JSON content-type, request
// logging, panic recovery).
package api

import (
	"context"

	"github.com/57blocks/vet-57b-backend/internal/models"
)

// Querier is the database interface required by the REST API handlers.
// Implementations can be backed by a real pgxpool (see internal/db/queries.go)
// or by a test mock.
type Querier interface {
	ListPets(ctx context.Context) ([]models.Pet, error)
	GetPet(ctx context.Context, id string) (*models.Pet, error)

	// ListAppointments returns all appointments, optionally filtered by petID.
	// When petID is non-empty, only appointments with matching pet_id are returned.
	ListAppointments(ctx context.Context, petID string) ([]models.Appointment, error)
	GetAppointment(ctx context.Context, id string) (*models.Appointment, error)

	ListCheckins(ctx context.Context, petID string) ([]models.Checkin, error)

	// PetExists checks whether a pet with the given ID exists in the database.
	// Used by the checkins endpoint to decide between empty array and 404.
	PetExists(ctx context.Context, id string) (bool, error)
}
