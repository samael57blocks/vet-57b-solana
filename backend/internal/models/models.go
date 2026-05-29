// Package models defines Go structs that represent the off-chain database records
// for pets, appointments, and checkins. These map to both the Solana Anchor account
// data and the PostgreSQL tables.
//
// JSON tags use snake_case for REST API responses. Fields mirror the SQL schema,
// not the Anchor program directly — PubKeys are stored as base58 strings, and
// created_at timestamps are added at the DB level.
package models

import "time"

// Pet represents a pet record (from on-chain MedicalRecord account).
type Pet struct {
	// On-chain account ID (Pubkey as base58 string).
	ID string `json:"id"`

	// Pet name.
	Name string `json:"name"`

	// Pet age in years.
	Age int `json:"age"`

	// Animal type: "Dog" or "Cat".
	AnimalType string `json:"animal_type"`

	// Caretaker's full name.
	CaretakerName string `json:"caretaker_name"`

	// Caretaker's contact phone number.
	CaretakerPhone string `json:"caretaker_phone"`

	// Record creation timestamp (set by the database on insert).
	CreatedAt time.Time `json:"created_at"`
}

// Appointment represents a medical appointment (from on-chain MedicalAppointment account).
type Appointment struct {
	// On-chain account ID (Pubkey as base58 string).
	ID string `json:"id"`

	// FK to pets.id — the pet this appointment is for.
	PetID string `json:"pet_id"`

	// Appointment date and time.
	Date time.Time `json:"date"`

	// Time of day as display string (e.g. "14:30").
	Time string `json:"time"`

	// Total appointment cost in lamports.
	AppointmentValue uint64 `json:"appointment_value"`

	// Amount already paid in lamports.
	PaidValue uint64 `json:"paid_value"`

	// Record creation timestamp (set by the database on insert).
	CreatedAt time.Time `json:"created_at"`
}

// Checkin represents a pet clinic check-in (from on-chain PetCheckin account).
type Checkin struct {
	// On-chain account ID (Pubkey as base58 string).
	ID string `json:"id"`

	// FK to pets.id — the pet that checked in.
	PetID string `json:"pet_id"`

	// Check-in timestamp (Unix timestamp from Solana Clock).
	CheckinTime time.Time `json:"checkin_time"`

	// Record creation timestamp (set by the database on insert).
	CreatedAt time.Time `json:"created_at"`
}
