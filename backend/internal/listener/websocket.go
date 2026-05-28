package listener

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"math/rand"
	"strings"
	"sync"
	"time"

	"github.com/57blocks/vet-57b-backend/internal/solana"
	solanago "github.com/gagliardetto/solana-go"
)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const (
	// programDataPrefix is the prefix Solana prepends to program-emitted data logs.
	programDataPrefix = "Program data: "

	// defaultInitialBackoff is the starting delay for WebSocket reconnection.
	defaultInitialBackoff = 1 * time.Second

	// backoffMultiplier is the factor by which the backoff increases each retry.
	backoffMultiplier = 2.0

	// maxJitter is the maximum random offset added to each backoff delay.
	maxJitter = 500 * time.Millisecond
)

// ---------------------------------------------------------------------------
// Backoff
// ---------------------------------------------------------------------------

// Backoff implements exponential backoff with jitter for WebSocket reconnection.
// It is safe for concurrent use when each goroutine has its own Backoff instance.
type Backoff struct {
	mu          sync.Mutex
	current     time.Duration
	max         time.Duration
	initial     time.Duration
	multiplier  float64
	jitter      time.Duration
}

// NewBackoff creates a Backoff starting at 1s, doubling each step, capped at max.
// If max is zero, defaults to 60s.
func NewBackoff(max time.Duration) *Backoff {
	if max <= 0 {
		max = 60 * time.Second
	}
	return &Backoff{
		current:    defaultInitialBackoff,
		max:        max,
		initial:    defaultInitialBackoff,
		multiplier: backoffMultiplier,
		jitter:     maxJitter,
	}
}

// Delay returns the current backoff delay (with jitter) and advances to the
// next step (capped at max). The jitter is ±500ms.
func (b *Backoff) Delay() time.Duration {
	b.mu.Lock()
	defer b.mu.Unlock()

	// Compute jitter: random value in [-maxJitter, +maxJitter).
	jitterMs := rand.Int63n(int64(b.jitter*2)) - int64(b.jitter)
	jitter := time.Duration(jitterMs)

	delay := b.current + jitter
	if delay < 0 {
		delay = 0
	}

	// Advance: double, cap at max.
	b.current = time.Duration(math.Min(
		float64(b.current)*b.multiplier,
		float64(b.max),
	))

	return delay
}

// Reset restores the backoff to its initial delay (1s).
func (b *Backoff) Reset() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.current = b.initial
}

// Current returns the current backoff delay without advancing.
func (b *Backoff) Current() time.Duration {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.current
}

// ---------------------------------------------------------------------------
// Backoff Tests Compatibility
// ---------------------------------------------------------------------------

// backoffDelay returns the backoff delay (with jitter) given the current delay
// value in seconds, and returns the next delay value. This is a pure function
// used by tests to verify the backoff progression without creating a Backoff
// instance. It mimics the same logic as Backoff.Delay().
//
// The jitter is deterministic when seed is provided (for testing). When seed is
// nil, it uses the default math/rand global source (not recommended for tests).
//
// Deprecated: tests should use Backoff directly. This function exists for
// legacy test compatibility.
func backoffDelay(current time.Duration, max time.Duration, seed int64) (delay time.Duration, next time.Duration) {
	var jitterMs int64
	if seed >= 0 {
		rng := rand.New(rand.NewSource(seed))
		jitterMs = rng.Int63n(int64(maxJitter*2)) - int64(maxJitter)
	} else {
		jitterMs = rand.Int63n(int64(maxJitter*2)) - int64(maxJitter)
	}
	jitter := time.Duration(jitterMs)

	delay = current + jitter
	if delay < 0 {
		delay = 0
	}
	next = time.Duration(math.Min(float64(current)*backoffMultiplier, float64(max)))
	return
}

// ---------------------------------------------------------------------------
// Event parsing
// ---------------------------------------------------------------------------

// parseAnchorEventLog parses a single Solana log line for Anchor events.
// It looks for the "Program data: <base64>" pattern, decodes the base64,
// matches the first 8 bytes against known event discriminators, and returns
// the parsed event. Returns nil if the log line is not a matching event.
func parseAnchorEventLog(line string) (interface{}, error) {
	if !strings.HasPrefix(line, programDataPrefix) {
		return nil, nil // silently skip
	}

	encoded := strings.TrimPrefix(line, programDataPrefix)
	encoded = strings.TrimSpace(encoded)

	raw, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		slog.Warn("listener: failed to decode base64 program data", "error", err)
		return nil, nil // skip malformed
	}

	if len(raw) < 8 {
		return nil, nil // too short for a discriminator
	}

	dec := newBorshDecoder(raw)
	disc, err := dec.readDiscriminator()
	if err != nil {
		return nil, nil
	}

	switch disc {
	case eventDiscriminatorMedicalRecordCreated:
		return parseMedicalRecordCreated(dec)
	case eventDiscriminatorMedicalAppointmentCreated:
		return parseMedicalAppointmentCreated(dec)
	default:
		// Unknown event — silently skip.
		return nil, nil
	}
}

// MedicalRecordCreatedEvent is the parsed representation of an Anchor
// MedicalRecordCreated event.
type MedicalRecordCreatedEvent struct {
	ID             string // base58-encoded Pubkey
	Name           string
	Age            uint8
	AnimalType     string // "Dog" or "Cat"
	CaretakerName  string
	CaretakerPhone string
}

// MedicalAppointmentCreatedEvent is the parsed representation of an Anchor
// MedicalAppointmentCreated event.
type MedicalAppointmentCreatedEvent struct {
	ID               string // base58-encoded Pubkey
	PetID            string // base58-encoded Pubkey
	Date             int64  // Unix timestamp
	Time             string
	AppointmentValue uint64
	PaidValue        uint64
}

// parseMedicalRecordCreated decodes the borsh-encoded fields of a
// MedicalRecordCreated event after the discriminator.
func parseMedicalRecordCreated(dec *borshDecoder) (*MedicalRecordCreatedEvent, error) {
	id, err := dec.readFixed32()
	if err != nil {
		return nil, fmt.Errorf("parse MedicalRecordCreated: id: %w", err)
	}
	name, err := dec.readString()
	if err != nil {
		return nil, fmt.Errorf("parse MedicalRecordCreated: name: %w", err)
	}
	age, err := dec.readU8()
	if err != nil {
		return nil, fmt.Errorf("parse MedicalRecordCreated: age: %w", err)
	}
	animalType, err := dec.readU8() // AnimalType enum → u8
	if err != nil {
		return nil, fmt.Errorf("parse MedicalRecordCreated: animal_type: %w", err)
	}
	caretakerName, err := dec.readString()
	if err != nil {
		return nil, fmt.Errorf("parse MedicalRecordCreated: caretaker_name: %w", err)
	}
	caretakerPhone, err := dec.readString()
	if err != nil {
		return nil, fmt.Errorf("parse MedicalRecordCreated: caretaker_phone: %w", err)
	}

	return &MedicalRecordCreatedEvent{
		ID:             encodePubkey(id),
		Name:           name,
		Age:            age,
		AnimalType:     animalTypeToString(animalType),
		CaretakerName:  caretakerName,
		CaretakerPhone: caretakerPhone,
	}, nil
}

// parseMedicalAppointmentCreated decodes the borsh-encoded fields of a
// MedicalAppointmentCreated event after the discriminator.
func parseMedicalAppointmentCreated(dec *borshDecoder) (*MedicalAppointmentCreatedEvent, error) {
	id, err := dec.readFixed32()
	if err != nil {
		return nil, fmt.Errorf("parse MedicalAppointmentCreated: id: %w", err)
	}
	petID, err := dec.readFixed32()
	if err != nil {
		return nil, fmt.Errorf("parse MedicalAppointmentCreated: pet_id: %w", err)
	}
	date, err := dec.readI64()
	if err != nil {
		return nil, fmt.Errorf("parse MedicalAppointmentCreated: date: %w", err)
	}
	time_, err := dec.readString()
	if err != nil {
		return nil, fmt.Errorf("parse MedicalAppointmentCreated: time: %w", err)
	}
	apptValue, err := dec.readU64()
	if err != nil {
		return nil, fmt.Errorf("parse MedicalAppointmentCreated: appointment_value: %w", err)
	}
	paidValue, err := dec.readU64()
	if err != nil {
		return nil, fmt.Errorf("parse MedicalAppointmentCreated: paid_value: %w", err)
	}

	return &MedicalAppointmentCreatedEvent{
		ID:               encodePubkey(id),
		PetID:            encodePubkey(petID),
		Date:             date,
		Time:             time_,
		AppointmentValue: apptValue,
		PaidValue:        paidValue,
	}, nil
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// animalTypeToString converts the Anchor AnimalType u8 variant to a string.
// 0 = Dog, 1 = Cat. Defaults to "Dog" for unknown values (defensive).
func animalTypeToString(t uint8) string {
	switch t {
	case 0:
		return "Dog"
	case 1:
		return "Cat"
	default:
		slog.Warn("listener: unknown animal type variant", "variant", t)
		return "Dog"
	}
}

// encodePubkey converts a [32]byte Solana Pubkey to a base58-encoded string.
func encodePubkey(pk [32]byte) string {
	return solanago.PublicKeyFromBytes(pk[:]).String()
}

// ---------------------------------------------------------------------------
// WebSocket Listener
// ---------------------------------------------------------------------------

// WSListener manages a WebSocket subscription to Solana program logs. It
// parses Anchor events and upserts them via the EventStore. Reconnection uses
// exponential backoff with infinite retries.
type WSListener struct {
	client    solana.SolanaClient
	store     EventStore
	programID string
	backoff   *Backoff
	logger    *slog.Logger
}

// NewWSListener creates a new WSListener.
func NewWSListener(client solana.SolanaClient, store EventStore, programID string, maxBackoff time.Duration) *WSListener {
	return &WSListener{
		client:    client,
		store:     store,
		programID: programID,
		backoff:   NewBackoff(maxBackoff),
		logger:    slog.With("component", "ws-listener"),
	}
}

// Run starts the WebSocket subscription loop. It blocks until the context is
// cancelled. On disconnect, it waits using exponential backoff and reconnects.
// Only a cancelled context terminates the loop — all other errors trigger
// reconnection with backoff.
func (w *WSListener) Run(ctx context.Context) error {
	w.logger.Info("starting WebSocket listener", "program_id", w.programID)

	for {
		// Check if we should stop.
		if err := ctx.Err(); err != nil {
			return nil //nolint:nilerr // context cancelled is not an error
		}

		err := w.subscribeAndProcess(ctx)
		if err == nil {
			// Clean exit (context cancelled), return.
			return nil
		}

		// Fatal errors (wrong network, bad URL) terminate.
		if isFatalError(err) {
			w.logger.Error("fatal WebSocket error, terminating", "error", err)
			return fmt.Errorf("ws-listener: fatal: %w", err)
		}

		// Non-fatal: reconnect with backoff.
		delay := w.backoff.Delay()
		w.logger.Warn("ws-listener: disconnected, reconnecting", "delay", delay, "error", err)
		select {
		case <-ctx.Done():
			return nil
		case <-time.After(delay):
		}
	}
}

// subscribeAndProcess creates a subscription, receives log entries, and
// processes them. Returns on context cancellation or fatal subscription error.
func (w *WSListener) subscribeAndProcess(ctx context.Context) error {
	logCh, sub, err := w.client.SubscribeLogs(ctx, w.programID)
	if err != nil {
		return fmt.Errorf("subscribe logs: %w", err)
	}
	defer func() {
		if err := sub.Unsubscribe(); err != nil {
			w.logger.Warn("ws-listener: unsubscribe error", "error", err)
		}
	}()

	w.logger.Info("ws-listener: subscribed to logs")
	w.backoff.Reset()

	for {
		select {
		case <-ctx.Done():
			return nil
		case logLines, ok := <-logCh:
			if !ok {
				return errors.New("subscription channel closed")
			}
			w.processLogBatch(logLines)
		}
	}
}

// processLogBatch processes a batch of log lines from a single transaction.
func (w *WSListener) processLogBatch(logLines []string) {
	for _, line := range logLines {
		evt, err := parseAnchorEventLog(line)
		if err != nil {
			w.logger.Warn("ws-listener: failed to parse event log", "line", line, "error", err)
			continue
		}
		if evt == nil {
			continue // not a matching event
		}

		if err := w.upsertEvent(context.Background(), evt); err != nil {
			w.logger.Error("ws-listener: failed to upsert event", "error", err)
		}
	}
}

// upsertEvent persists an event to the database via the EventStore.
func (w *WSListener) upsertEvent(ctx context.Context, evt interface{}) error {
	switch e := evt.(type) {
	case *MedicalRecordCreatedEvent:
		return w.store.UpsertPet(ctx, UpsertPetParams{
			ID:             e.ID,
			Name:           e.Name,
			Age:            e.Age,
			AnimalType:     e.AnimalType,
			CaretakerName:  e.CaretakerName,
			CaretakerPhone: e.CaretakerPhone,
		})
	case *MedicalAppointmentCreatedEvent:
		return w.store.UpsertAppointment(ctx, UpsertAppointmentParams{
			ID:               e.ID,
			PetID:            e.PetID,
			Date:             time.Unix(e.Date, 0),
			Time:             e.Time,
			AppointmentValue: e.AppointmentValue,
			PaidValue:        e.PaidValue,
		})
	default:
		return fmt.Errorf("unknown event type: %T", evt)
	}
}

// isFatalError returns true for errors that should NOT trigger reconnection.
// These include wrong network, bad URL, or invalid program ID errors.
func isFatalError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	// Common fatal error patterns.
	fatalPatterns := []string{
		"connection refused",
		"no such host",
		"invalid URL",
		"wrong network",
	}
	for _, p := range fatalPatterns {
		if strings.Contains(msg, p) {
			return true
		}
	}
	return false
}
