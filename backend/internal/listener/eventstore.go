package listener

import (
	"context"
	"time"
)

// EventStore is the database interface required by the event indexer. The
// listener and poller upsert on-chain data into PostgreSQL through this
// interface, which can be backed by a real pgxpool or a test mock.
type EventStore interface {
	UpsertPet(ctx context.Context, p UpsertPetParams) error
	UpsertAppointment(ctx context.Context, a UpsertAppointmentParams) error
	UpsertCheckin(ctx context.Context, c UpsertCheckinParams) error
}

// UpsertPetParams carries the fields needed to upsert a pet record.
// CreatedAt is managed by the database (DEFAULT NOW()).
type UpsertPetParams struct {
	ID             string
	Name           string
	Age            uint8
	AnimalType     string // "Dog" or "Cat"
	CaretakerName  string
	CaretakerPhone string
}

// UpsertAppointmentParams carries the fields needed to upsert an appointment.
type UpsertAppointmentParams struct {
	ID               string
	PetID            string
	Date             time.Time
	Time             string
	AppointmentValue uint64
	PaidValue        uint64
}

// UpsertCheckinParams carries the fields needed to upsert a checkin.
type UpsertCheckinParams struct {
	ID          string
	PetID       string
	CheckinTime time.Time
}

// MockEventStore is a mock implementation of EventStore for testing.
type MockEventStore struct {
	UpsertPetFn         func(ctx context.Context, p UpsertPetParams) error
	UpsertAppointmentFn func(ctx context.Context, a UpsertAppointmentParams) error
	UpsertCheckinFn     func(ctx context.Context, c UpsertCheckinParams) error
}

var _ EventStore = (*MockEventStore)(nil)

func (m *MockEventStore) UpsertPet(ctx context.Context, p UpsertPetParams) error {
	if m.UpsertPetFn == nil {
		return nil
	}
	return m.UpsertPetFn(ctx, p)
}

func (m *MockEventStore) UpsertAppointment(ctx context.Context, a UpsertAppointmentParams) error {
	if m.UpsertAppointmentFn == nil {
		return nil
	}
	return m.UpsertAppointmentFn(ctx, a)
}

func (m *MockEventStore) UpsertCheckin(ctx context.Context, c UpsertCheckinParams) error {
	if m.UpsertCheckinFn == nil {
		return nil
	}
	return m.UpsertCheckinFn(ctx, c)
}
