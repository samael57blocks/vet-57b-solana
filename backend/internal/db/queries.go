// Package db provides PostgreSQL connection pooling, migration execution, and
// query helpers that implement the api.Querier interface.
package db

import (
	"context"
	"fmt"
	"time"

	"github.com/57blocks/vet-57b-backend/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Queries implements api.Querier using a pgxpool.Pool.
type Queries struct {
	pool *pgxpool.Pool
}

// NewQueries creates a new Queries instance backed by the given pool.
func NewQueries(pool *pgxpool.Pool) *Queries {
	return &Queries{pool: pool}
}

// ListPets returns all pets ordered by creation date (newest first).
func (q *Queries) ListPets(ctx context.Context) ([]models.Pet, error) {
	rows, err := q.pool.Query(ctx, `
		SELECT id, name, age, animal_type, caretaker_name, caretaker_phone, created_at
		FROM pets
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("list pets: %w", err)
	}
	defer rows.Close()

	var pets []models.Pet
	for rows.Next() {
		var p models.Pet
		if err := rows.Scan(&p.ID, &p.Name, &p.Age, &p.AnimalType, &p.CaretakerName, &p.CaretakerPhone, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan pet: %w", err)
		}
		pets = append(pets, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iter: %w", err)
	}

	return pets, nil
}

// GetPet returns a single pet by ID, or nil if not found.
func (q *Queries) GetPet(ctx context.Context, id string) (*models.Pet, error) {
	row := q.pool.QueryRow(ctx, `
		SELECT id, name, age, animal_type, caretaker_name, caretaker_phone, created_at
		FROM pets
		WHERE id = $1
	`, id)

	var p models.Pet
	err := row.Scan(&p.ID, &p.Name, &p.Age, &p.AnimalType, &p.CaretakerName, &p.CaretakerPhone, &p.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get pet: %w", err)
	}
	return &p, nil
}

// ListAppointments returns appointments, optionally filtered by petID.
// When petID is non-empty, only appointments with matching pet_id are returned.
func (q *Queries) ListAppointments(ctx context.Context, petID string) ([]models.Appointment, error) {
	var err error

	var rows pgx.Rows
	if petID != "" {
		rows, err = q.pool.Query(ctx, `
			SELECT id, pet_id, date, time, appointment_value, paid_value, created_at
			FROM appointments
			WHERE pet_id = $1
			ORDER BY date DESC
		`, petID)
	} else {
		rows, err = q.pool.Query(ctx, `
			SELECT id, pet_id, date, time, appointment_value, paid_value, created_at
			FROM appointments
			ORDER BY date DESC
		`)
	}
	if err != nil {
		return nil, fmt.Errorf("list appointments: %w", err)
	}
	defer rows.Close()

	var appointments []models.Appointment
	for rows.Next() {
		var a models.Appointment
		if err := rows.Scan(&a.ID, &a.PetID, &a.Date, &a.Time, &a.AppointmentValue, &a.PaidValue, &a.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan appointment: %w", err)
		}
		appointments = append(appointments, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iter: %w", err)
	}

	return appointments, nil
}

// GetAppointment returns a single appointment by ID, or nil if not found.
func (q *Queries) GetAppointment(ctx context.Context, id string) (*models.Appointment, error) {
	row := q.pool.QueryRow(ctx, `
		SELECT id, pet_id, date, time, appointment_value, paid_value, created_at
		FROM appointments
		WHERE id = $1
	`, id)

	var a models.Appointment
	err := row.Scan(&a.ID, &a.PetID, &a.Date, &a.Time, &a.AppointmentValue, &a.PaidValue, &a.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get appointment: %w", err)
	}
	return &a, nil
}

// ListCheckins returns all checkins for a given pet ID.
func (q *Queries) ListCheckins(ctx context.Context, petID string) ([]models.Checkin, error) {
	rows, err := q.pool.Query(ctx, `
		SELECT id, pet_id, checkin_time, created_at
		FROM checkins
		WHERE pet_id = $1
		ORDER BY checkin_time DESC
	`, petID)
	if err != nil {
		return nil, fmt.Errorf("list checkins: %w", err)
	}
	defer rows.Close()

	var checkins []models.Checkin
	for rows.Next() {
		var c models.Checkin
		if err := rows.Scan(&c.ID, &c.PetID, &c.CheckinTime, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan checkin: %w", err)
		}
		checkins = append(checkins, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iter: %w", err)
	}

	return checkins, nil
}

// PetExists checks whether a pet with the given ID exists in the database.
func (q *Queries) PetExists(ctx context.Context, id string) (bool, error) {
	var exists bool
	err := q.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM pets WHERE id = $1)`, id).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("pet exists: %w", err)
	}
	return exists, nil
}

// ---------------------------------------------------------------------------
// Upsert methods (used by the event indexer)
// ---------------------------------------------------------------------------

// UpsertPet inserts or updates a pet record. Uses ON CONFLICT (id) DO UPDATE
// for idempotent upsert. CreatedAt is left at the DB DEFAULT (NOW()).
func (q *Queries) UpsertPet(ctx context.Context, id, name, animalType, caretakerName, caretakerPhone string, age uint8) error {
	_, err := q.pool.Exec(ctx, `
		INSERT INTO pets (id, name, age, animal_type, caretaker_name, caretaker_phone)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			age = EXCLUDED.age,
			animal_type = EXCLUDED.animal_type,
			caretaker_name = EXCLUDED.caretaker_name,
			caretaker_phone = EXCLUDED.caretaker_phone
	`, id, name, age, animalType, caretakerName, caretakerPhone)
	if err != nil {
		return fmt.Errorf("upsert pet: %w", err)
	}
	return nil
}

// UpsertAppointment inserts or updates an appointment record.
func (q *Queries) UpsertAppointment(
	ctx context.Context,
	id, petID, timeStr string,
	date time.Time,
	appointmentValue, paidValue uint64,
) error {
	_, err := q.pool.Exec(ctx, `
		INSERT INTO appointments (id, pet_id, date, time, appointment_value, paid_value)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO UPDATE SET
			pet_id = EXCLUDED.pet_id,
			date = EXCLUDED.date,
			time = EXCLUDED.time,
			appointment_value = EXCLUDED.appointment_value,
			paid_value = EXCLUDED.paid_value
	`, id, petID, date, timeStr, appointmentValue, paidValue)
	if err != nil {
		return fmt.Errorf("upsert appointment: %w", err)
	}
	return nil
}

// UpsertCheckin inserts or updates a checkin record.
func (q *Queries) UpsertCheckin(
	ctx context.Context,
	id, petID string,
	checkinTime time.Time,
) error {
	_, err := q.pool.Exec(ctx, `
		INSERT INTO checkins (id, pet_id, checkin_time)
		VALUES ($1, $2, $3)
		ON CONFLICT (id) DO UPDATE SET
			pet_id = EXCLUDED.pet_id,
			checkin_time = EXCLUDED.checkin_time
	`, id, petID, checkinTime)
	if err != nil {
		return fmt.Errorf("upsert checkin: %w", err)
	}
	return nil
}


