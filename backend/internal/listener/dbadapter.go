package listener

import (
	"context"
	"time"
)

// DBAdapter wraps a Querier-like interface and implements listener.EventStore.
// This bridges the db package's upsert methods (which take primitive types) to
// the listener's typed EventStore interface.
type DBAdapter struct {
	q interface {
		UpsertPet(ctx context.Context, id, name, animalType, caretakerName, caretakerPhone string, age uint8) error
		UpsertAppointment(ctx context.Context, id, petID, timeStr string, date time.Time, appointmentValue, paidValue uint64) error
		UpsertCheckin(ctx context.Context, id, petID string, checkinTime time.Time) error
	}
}

// NewDBAdapter creates a new DBAdapter that wraps a DB implementation.
func NewDBAdapter(q interface {
	UpsertPet(ctx context.Context, id, name, animalType, caretakerName, caretakerPhone string, age uint8) error
	UpsertAppointment(ctx context.Context, id, petID, timeStr string, date time.Time, appointmentValue, paidValue uint64) error
	UpsertCheckin(ctx context.Context, id, petID string, checkinTime time.Time) error
}) *DBAdapter {
	return &DBAdapter{q: q}
}

func (a *DBAdapter) UpsertPet(ctx context.Context, p UpsertPetParams) error {
	return a.q.UpsertPet(ctx, p.ID, p.Name, p.AnimalType, p.CaretakerName, p.CaretakerPhone, p.Age)
}

func (a *DBAdapter) UpsertAppointment(ctx context.Context, aParams UpsertAppointmentParams) error {
	return a.q.UpsertAppointment(ctx, aParams.ID, aParams.PetID, aParams.Time, aParams.Date, aParams.AppointmentValue, aParams.PaidValue)
}

func (a *DBAdapter) UpsertCheckin(ctx context.Context, c UpsertCheckinParams) error {
	return a.q.UpsertCheckin(ctx, c.ID, c.PetID, c.CheckinTime)
}
