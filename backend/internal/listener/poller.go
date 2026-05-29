package listener

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/57blocks/vet-57b-backend/internal/solana"
)

// ---------------------------------------------------------------------------
// Account Data Size Constants
// ---------------------------------------------------------------------------
// These match the SPACE constants in the Anchor program:
//
//	MedicalRecord:   8 discriminator + 32 id + (4+50) name + 1 age
//	                 + 1 animal_type + (4+50) caretaker_name + (4+20) caretaker_phone + 1 bump
//	                 = 8 + 32 + 54 + 1 + 1 + 54 + 24 + 1 = 175
//
//	MedicalAppointment: 8 discriminator + 32 id + 32 medical_record
//	                    + 8 date + (4+10) time + 8 appointment_value + 8 paid_value + 1 bump
//	                    = 8 + 32 + 32 + 8 + 14 + 8 + 8 + 1 = 111
//
//	PetCheckin: 8 discriminator + 32 id + 32 medical_record
//	            + 8 checkin_time + 1 bump
//	            = 8 + 32 + 32 + 8 + 1 = 81
const (
	medicalRecordDataSize    = 175
	medicalAppointmentDataSize = 111
	petCheckinDataSize       = 81
)

// ---------------------------------------------------------------------------
// Poller
// ---------------------------------------------------------------------------

// Poller periodically fetches on-chain accounts via GetProgramAccounts and
// upserts them into the database. It polls three account types: MedicalRecord,
// MedicalAppointment, and PetCheckin, using DataSize filters to minimise
// network overhead.
type Poller struct {
	client   solana.SolanaClient
	store    EventStore
	programID string
	interval time.Duration
	logger   *slog.Logger
}

// NewPoller creates a new Poller.
func NewPoller(client solana.SolanaClient, store EventStore, programID string, interval time.Duration) *Poller {
	return &Poller{
		client:    client,
		store:     store,
		programID: programID,
		interval:  interval,
		logger:    slog.With("component", "poller"),
	}
}

// Run starts the polling loop. It polls immediately on start, then every
// interval. Blocks until the context is cancelled.
func (p *Poller) Run(ctx context.Context) error {
	p.logger.Info("starting poller", "program_id", p.programID, "interval", p.interval)

	// Poll immediately on start.
	if err := p.pollAll(ctx); err != nil {
		p.logger.Warn("poller: initial poll failed", "error", err)
	}

	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			p.logger.Info("poller: stopping")
			return nil
		case <-ticker.C:
			if err := p.pollAll(ctx); err != nil {
				p.logger.Warn("poller: poll cycle failed", "error", err)
			}
		}
	}
}

// pollAll fetches accounts for all three types and upserts them.
func (p *Poller) pollAll(ctx context.Context) error {
	if err := p.pollMedicalRecords(ctx); err != nil {
		return fmt.Errorf("medical records: %w", err)
	}
	if err := p.pollMedicalAppointments(ctx); err != nil {
		return fmt.Errorf("medical appointments: %w", err)
	}
	if err := p.pollPetCheckins(ctx); err != nil {
		return fmt.Errorf("pet checkins: %w", err)
	}
	return nil
}

// pollMedicalRecords fetches and upserts all MedicalRecord accounts.
func (p *Poller) pollMedicalRecords(ctx context.Context) error {
	accounts, err := p.client.GetProgramAccounts(ctx, p.programID, medicalRecordDataSize)
	if err != nil {
		return fmt.Errorf("get program accounts: %w", err)
	}

	var upserted int
	for _, acct := range accounts {
		pet, err := deserializeMedicalRecord(acct.Data)
		if err != nil {
			p.logger.Warn("poller: failed to deserialize MedicalRecord", "pubkey", acct.Pubkey, "error", err)
			continue
		}
		if err := p.store.UpsertPet(ctx, UpsertPetParams{
			ID:             pet.Pubkey,
			Name:           pet.Name,
			Age:            pet.Age,
			AnimalType:     pet.AnimalType,
			CaretakerName:  pet.CaretakerName,
			CaretakerPhone: pet.CaretakerPhone,
		}); err != nil {
			return fmt.Errorf("upsert pet %s: %w", pet.Pubkey, err)
		}
		upserted++
	}

	if upserted > 0 {
		p.logger.Debug("poller: upserted medical records", "count", upserted)
	}
	return nil
}

// pollMedicalAppointments fetches and upserts all MedicalAppointment accounts.
func (p *Poller) pollMedicalAppointments(ctx context.Context) error {
	accounts, err := p.client.GetProgramAccounts(ctx, p.programID, medicalAppointmentDataSize)
	if err != nil {
		return fmt.Errorf("get program accounts: %w", err)
	}

	var upserted int
	for _, acct := range accounts {
		apt, err := deserializeMedicalAppointment(acct.Data)
		if err != nil {
			p.logger.Warn("poller: failed to deserialize MedicalAppointment", "pubkey", acct.Pubkey, "error", err)
			continue
		}
		if err := p.store.UpsertAppointment(ctx, UpsertAppointmentParams{
			ID:               apt.Pubkey,
			PetID:            apt.PetID,
			Date:             time.Unix(apt.Date, 0),
			Time:             apt.Time,
			AppointmentValue: apt.AppointmentValue,
			PaidValue:        apt.PaidValue,
		}); err != nil {
			return fmt.Errorf("upsert appointment %s: %w", apt.Pubkey, err)
		}
		upserted++
	}

	if upserted > 0 {
		p.logger.Debug("poller: upserted medical appointments", "count", upserted)
	}
	return nil
}

// pollPetCheckins fetches and upserts all PetCheckin accounts.
func (p *Poller) pollPetCheckins(ctx context.Context) error {
	accounts, err := p.client.GetProgramAccounts(ctx, p.programID, petCheckinDataSize)
	if err != nil {
		return fmt.Errorf("get program accounts: %w", err)
	}

	var upserted int
	for _, acct := range accounts {
		chk, err := deserializePetCheckin(acct.Data)
		if err != nil {
			p.logger.Warn("poller: failed to deserialize PetCheckin", "pubkey", acct.Pubkey, "error", err)
			continue
		}
		if err := p.store.UpsertCheckin(ctx, UpsertCheckinParams{
			ID:          chk.Pubkey,
			PetID:       chk.PetID,
			CheckinTime: time.Unix(chk.CheckinTime, 0),
		}); err != nil {
			return fmt.Errorf("upsert checkin %s: %w", chk.Pubkey, err)
		}
		upserted++
	}

	if upserted > 0 {
		p.logger.Debug("poller: upserted pet checkins", "count", upserted)
	}
	return nil
}

// ---------------------------------------------------------------------------
// Deserialized Account Types
// ---------------------------------------------------------------------------

// DeserializedMedicalRecord holds the fields from a polled MedicalRecord account.
type DeserializedMedicalRecord struct {
	Pubkey         string
	Name           string
	Age            uint8
	AnimalType     string
	CaretakerName  string
	CaretakerPhone string
}

// DeserializedMedicalAppointment holds the fields from a polled MedicalAppointment.
type DeserializedMedicalAppointment struct {
	Pubkey           string
	PetID            string
	Date             int64
	Time             string
	AppointmentValue uint64
	PaidValue        uint64
}

// DeserializedPetCheckin holds the fields from a polled PetCheckin account.
type DeserializedPetCheckin struct {
	Pubkey      string
	PetID       string
	CheckinTime int64
}

// ---------------------------------------------------------------------------
// Account Deserialization
// ---------------------------------------------------------------------------

// deserializeMedicalRecord decodes a MedicalRecord account from raw bytes.
// The data includes the 8-byte Anchor account discriminator followed by
// borsh-encoded fields.
func deserializeMedicalRecord(data []byte) (*DeserializedMedicalRecord, error) {
	dec := newBorshDecoder(data)

	// Verify discriminator.
	disc, err := dec.readDiscriminator()
	if err != nil {
		return nil, fmt.Errorf("medical record: read discriminator: %w", err)
	}
	if disc != accountDiscriminatorMedicalRecord {
		return nil, fmt.Errorf("medical record: unexpected discriminator: %x", disc)
	}

	id, err := dec.readFixed32()
	if err != nil {
		return nil, fmt.Errorf("medical record: id: %w", err)
	}
	name, err := dec.readString()
	if err != nil {
		return nil, fmt.Errorf("medical record: name: %w", err)
	}
	age, err := dec.readU8()
	if err != nil {
		return nil, fmt.Errorf("medical record: age: %w", err)
	}
	animalType, err := dec.readU8()
	if err != nil {
		return nil, fmt.Errorf("medical record: animal_type: %w", err)
	}
	caretakerName, err := dec.readString()
	if err != nil {
		return nil, fmt.Errorf("medical record: caretaker_name: %w", err)
	}
	caretakerPhone, err := dec.readString()
	if err != nil {
		return nil, fmt.Errorf("medical record: caretaker_phone: %w", err)
	}
	// bump is read but not stored in the model.
	if _, err := dec.readU8(); err != nil {
		return nil, fmt.Errorf("medical record: bump: %w", err)
	}

	return &DeserializedMedicalRecord{
		Pubkey:         encodePubkey(id),
		Name:           name,
		Age:            age,
		AnimalType:     animalTypeToString(animalType),
		CaretakerName:  caretakerName,
		CaretakerPhone: caretakerPhone,
	}, nil
}

// deserializeMedicalAppointment decodes a MedicalAppointment account from raw bytes.
func deserializeMedicalAppointment(data []byte) (*DeserializedMedicalAppointment, error) {
	dec := newBorshDecoder(data)

	disc, err := dec.readDiscriminator()
	if err != nil {
		return nil, fmt.Errorf("medical appointment: read discriminator: %w", err)
	}
	if disc != accountDiscriminatorMedicalAppointment {
		return nil, fmt.Errorf("medical appointment: unexpected discriminator: %x", disc)
	}

	id, err := dec.readFixed32()
	if err != nil {
		return nil, fmt.Errorf("medical appointment: id: %w", err)
	}
	petID, err := dec.readFixed32()
	if err != nil {
		return nil, fmt.Errorf("medical appointment: medical_record: %w", err)
	}
	date, err := dec.readI64()
	if err != nil {
		return nil, fmt.Errorf("medical appointment: date: %w", err)
	}
	time_, err := dec.readString()
	if err != nil {
		return nil, fmt.Errorf("medical appointment: time: %w", err)
	}
	apptValue, err := dec.readU64()
	if err != nil {
		return nil, fmt.Errorf("medical appointment: appointment_value: %w", err)
	}
	paidValue, err := dec.readU64()
	if err != nil {
		return nil, fmt.Errorf("medical appointment: paid_value: %w", err)
	}
	// bump
	if _, err := dec.readU8(); err != nil {
		return nil, fmt.Errorf("medical appointment: bump: %w", err)
	}

	return &DeserializedMedicalAppointment{
		Pubkey:           encodePubkey(id),
		PetID:            encodePubkey(petID),
		Date:             date,
		Time:             time_,
		AppointmentValue: apptValue,
		PaidValue:        paidValue,
	}, nil
}

// deserializePetCheckin decodes a PetCheckin account from raw bytes.
func deserializePetCheckin(data []byte) (*DeserializedPetCheckin, error) {
	dec := newBorshDecoder(data)

	disc, err := dec.readDiscriminator()
	if err != nil {
		return nil, fmt.Errorf("pet checkin: read discriminator: %w", err)
	}
	if disc != accountDiscriminatorPetCheckin {
		return nil, fmt.Errorf("pet checkin: unexpected discriminator: %x", disc)
	}

	id, err := dec.readFixed32()
	if err != nil {
		return nil, fmt.Errorf("pet checkin: id: %w", err)
	}
	petID, err := dec.readFixed32()
	if err != nil {
		return nil, fmt.Errorf("pet checkin: medical_record: %w", err)
	}
	checkinTime, err := dec.readI64()
	if err != nil {
		return nil, fmt.Errorf("pet checkin: checkin_time: %w", err)
	}
	// bump
	if _, err := dec.readU8(); err != nil {
		return nil, fmt.Errorf("pet checkin: bump: %w", err)
	}

	return &DeserializedPetCheckin{
		Pubkey:      encodePubkey(id),
		PetID:       encodePubkey(petID),
		CheckinTime: checkinTime,
	}, nil
}
