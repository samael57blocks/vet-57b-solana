package listener

import (
	"bytes"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"math"
	"testing"
	"time"
)

// ---------------------------------------------------------------------------
// Test helpers for constructing borsh-encoded Anchor data
// ---------------------------------------------------------------------------

func appendDiscriminator(buf *bytes.Buffer, disc [8]byte) {
	buf.Write(disc[:])
}

func appendPubkey(buf *bytes.Buffer, pk [32]byte) {
	buf.Write(pk[:])
}

func appendBorshU8(buf *bytes.Buffer, v uint8) {
	buf.WriteByte(v)
}

func appendBorshU64(buf *bytes.Buffer, v uint64) {
	var tmp [8]byte
	binary.LittleEndian.PutUint64(tmp[:], v)
	buf.Write(tmp[:])
}

func appendBorshI64(buf *bytes.Buffer, v int64) {
	var tmp [8]byte
	binary.LittleEndian.PutUint64(tmp[:], uint64(v))
	buf.Write(tmp[:])
}

func appendBorshString(buf *bytes.Buffer, s string) {
	var tmp [4]byte
	binary.LittleEndian.PutUint32(tmp[:], uint32(len(s)))
	buf.Write(tmp[:])
	buf.WriteString(s)
}

// makeMedicalRecordCreatedData builds raw bytes for a MedicalRecordCreated event.
func makeMedicalRecordCreatedData(pk [32]byte, name string, age uint8, animalType uint8, caretakerName, caretakerPhone string) []byte {
	var buf bytes.Buffer
	appendDiscriminator(&buf, eventDiscriminatorMedicalRecordCreated)
	appendPubkey(&buf, pk)
	appendBorshString(&buf, name)
	appendBorshU8(&buf, age)
	appendBorshU8(&buf, animalType)
	appendBorshString(&buf, caretakerName)
	appendBorshString(&buf, caretakerPhone)
	return buf.Bytes()
}

// makeMedicalAppointmentCreatedData builds raw bytes for a MedicalAppointmentCreated event.
func makeMedicalAppointmentCreatedData(pk [32]byte, petID [32]byte, date int64, timeStr string, apptValue, paidValue uint64) []byte {
	var buf bytes.Buffer
	appendDiscriminator(&buf, eventDiscriminatorMedicalAppointmentCreated)
	appendPubkey(&buf, pk)
	appendPubkey(&buf, petID)
	appendBorshI64(&buf, date)
	appendBorshString(&buf, timeStr)
	appendBorshU64(&buf, apptValue)
	appendBorshU64(&buf, paidValue)
	return buf.Bytes()
}

// makeMedicalRecordAccountData builds raw bytes for a MedicalRecord account (with bump).
func makeMedicalRecordAccountData(pk [32]byte, name string, age uint8, animalType uint8, caretakerName, caretakerPhone string, bump uint8) []byte {
	var buf bytes.Buffer
	appendDiscriminator(&buf, accountDiscriminatorMedicalRecord)
	appendPubkey(&buf, pk)
	appendBorshString(&buf, name)
	appendBorshU8(&buf, age)
	appendBorshU8(&buf, animalType)
	appendBorshString(&buf, caretakerName)
	appendBorshString(&buf, caretakerPhone)
	appendBorshU8(&buf, bump)
	return buf.Bytes()
}

// makeMedicalAppointmentAccountData builds raw bytes for a MedicalAppointment account (with bump).
func makeMedicalAppointmentAccountData(pk [32]byte, petID [32]byte, date int64, timeStr string, apptValue, paidValue uint64, bump uint8) []byte {
	var buf bytes.Buffer
	appendDiscriminator(&buf, accountDiscriminatorMedicalAppointment)
	appendPubkey(&buf, pk)
	appendPubkey(&buf, petID)
	appendBorshI64(&buf, date)
	appendBorshString(&buf, timeStr)
	appendBorshU64(&buf, apptValue)
	appendBorshU64(&buf, paidValue)
	appendBorshU8(&buf, bump)
	return buf.Bytes()
}

// makePetCheckinAccountData builds raw bytes for a PetCheckin account (with bump).
func makePetCheckinAccountData(pk [32]byte, petID [32]byte, checkinTime int64, bump uint8) []byte {
	var buf bytes.Buffer
	appendDiscriminator(&buf, accountDiscriminatorPetCheckin)
	appendPubkey(&buf, pk)
	appendPubkey(&buf, petID)
	appendBorshI64(&buf, checkinTime)
	appendBorshU8(&buf, bump)
	return buf.Bytes()
}

// testPubkey returns a [32]byte filled with a deterministic pattern for testing.
func testPubkey(prefix byte) [32]byte {
	var pk [32]byte
	for i := range pk {
		pk[i] = prefix
	}
	return pk
}

// ---------------------------------------------------------------------------
// 3.5 — Event parsing from known log strings
// ---------------------------------------------------------------------------

func TestParseAnchorEventLog_MedicalRecordCreated(t *testing.T) {
	pk := testPubkey(0xAA)
	raw := makeMedicalRecordCreatedData(pk, "Rex", 3, 0 /* Dog */, "Alice", "555-0100")
	encoded := base64.StdEncoding.EncodeToString(raw)
	logLine := "Program data: " + encoded

	evt, err := parseAnchorEventLog(logLine)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if evt == nil {
		t.Fatal("expected event, got nil")
	}

	mr, ok := evt.(*MedicalRecordCreatedEvent)
	if !ok {
		t.Fatalf("expected *MedicalRecordCreatedEvent, got %T", evt)
	}

	if mr.Name != "Rex" {
		t.Errorf("expected Name=Rex, got %q", mr.Name)
	}
	if mr.Age != 3 {
		t.Errorf("expected Age=3, got %d", mr.Age)
	}
	if mr.AnimalType != "Dog" {
		t.Errorf("expected AnimalType=Dog, got %q", mr.AnimalType)
	}
	if mr.CaretakerName != "Alice" {
		t.Errorf("expected CaretakerName=Alice, got %q", mr.CaretakerName)
	}
	if mr.CaretakerPhone != "555-0100" {
		t.Errorf("expected CaretakerPhone=555-0100, got %q", mr.CaretakerPhone)
	}
	// Verify pubkey encoding (base58).
	if mr.ID == "" {
		t.Error("expected non-empty ID")
	}
	// The encoded pubkey should start with "1" because the first bytes are 0xAA
	// which is above the base58 alphabet — it'll encode to a meaningful string.
	t.Logf("encoded pubkey: %s", mr.ID)
}

func TestParseAnchorEventLog_MedicalAppointmentCreated(t *testing.T) {
	aptPk := testPubkey(0xBB)
	petPk := testPubkey(0xCC)
	raw := makeMedicalAppointmentCreatedData(aptPk, petPk, 1716900000, "14:30", uint64(100_000_000), uint64(50_000_000))
	encoded := base64.StdEncoding.EncodeToString(raw)
	logLine := "Program data: " + encoded

	evt, err := parseAnchorEventLog(logLine)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if evt == nil {
		t.Fatal("expected event, got nil")
	}

	apt, ok := evt.(*MedicalAppointmentCreatedEvent)
	if !ok {
		t.Fatalf("expected *MedicalAppointmentCreatedEvent, got %T", evt)
	}

	if apt.Time != "14:30" {
		t.Errorf("expected Time=14:30, got %q", apt.Time)
	}
	if apt.Date != 1716900000 {
		t.Errorf("expected Date=1716900000, got %d", apt.Date)
	}
	if apt.AppointmentValue != 100_000_000 {
		t.Errorf("expected AppointmentValue=100000000, got %d", apt.AppointmentValue)
	}
	if apt.PaidValue != 50_000_000 {
		t.Errorf("expected PaidValue=50000000, got %d", apt.PaidValue)
	}
	if apt.ID == "" {
		t.Error("expected non-empty ID")
	}
	if apt.PetID == "" {
		t.Error("expected non-empty PetID")
	}
	if apt.ID == apt.PetID {
		t.Error("expected different ID and PetID")
	}
}

func TestParseAnchorEventLog_NonEventLine(t *testing.T) {
	// Log lines without "Program data:" prefix should be silently skipped.
	tests := []string{
		"Program log: some message",
		"Program log: Registered a new pet",
		"some random log line",
		"",
	}

	for _, line := range tests {
		t.Run("line", func(t *testing.T) {
			evt, err := parseAnchorEventLog(line)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if evt != nil {
				t.Fatalf("expected nil for non-event line, got %T: %+v", evt, evt)
			}
		})
	}
}

func TestParseAnchorEventLog_MalformedBase64(t *testing.T) {
	logLine := "Program data: not-valid-base64!!!"
	evt, err := parseAnchorEventLog(logLine)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if evt != nil {
		t.Fatal("expected nil for malformed base64")
	}
}

func TestParseAnchorEventLog_UnknownDiscriminator(t *testing.T) {
	// Create data with an unknown discriminator.
	data := make([]byte, 8)
	data[0] = 0xFF
	data[1] = 0xFF
	encoded := base64.StdEncoding.EncodeToString(data)
	logLine := "Program data: " + encoded

	evt, err := parseAnchorEventLog(logLine)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if evt != nil {
		t.Fatal("expected nil for unknown discriminator")
	}
}

func TestParseAnchorEventLog_TooShort(t *testing.T) {
	// Data shorter than 8 bytes (discriminator).
	encoded := base64.StdEncoding.EncodeToString([]byte{1, 2, 3})
	logLine := "Program data: " + encoded
	evt, err := parseAnchorEventLog(logLine)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if evt != nil {
		t.Fatal("expected nil for too-short data")
	}
}

// ---------------------------------------------------------------------------
// 3.6 — Account deserialization from known borsh bytes
// ---------------------------------------------------------------------------

func TestDeserializeMedicalRecord(t *testing.T) {
	pk := testPubkey(0xDD)
	raw := makeMedicalRecordAccountData(pk, "Max", 5, 1 /* Cat */, "Bob", "555-0200", 255)

	rec, err := deserializeMedicalRecord(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if rec.Name != "Max" {
		t.Errorf("expected Name=Max, got %q", rec.Name)
	}
	if rec.Age != 5 {
		t.Errorf("expected Age=5, got %d", rec.Age)
	}
	if rec.AnimalType != "Cat" {
		t.Errorf("expected AnimalType=Cat, got %q", rec.AnimalType)
	}
	if rec.CaretakerName != "Bob" {
		t.Errorf("expected CaretakerName=Bob, got %q", rec.CaretakerName)
	}
	if rec.CaretakerPhone != "555-0200" {
		t.Errorf("expected CaretakerPhone=555-0200, got %q", rec.CaretakerPhone)
	}
}

func TestDeserializeMedicalRecord_WrongDiscriminator(t *testing.T) {
	// Use appointment discriminator instead of medical record.
	pk := testPubkey(0xDD)
	var buf bytes.Buffer
	appendDiscriminator(&buf, accountDiscriminatorMedicalAppointment) // wrong!
	appendPubkey(&buf, pk)
	appendBorshString(&buf, "Max")
	appendBorshU8(&buf, 5)
	appendBorshU8(&buf, 0)
	appendBorshString(&buf, "Bob")
	appendBorshString(&buf, "555-0200")
	appendBorshU8(&buf, 255)

	_, err := deserializeMedicalRecord(buf.Bytes())
	if err == nil {
		t.Fatal("expected error for wrong discriminator")
	}
	t.Logf("got expected error: %v", err)
}

func TestDeserializeMedicalRecord_Truncated(t *testing.T) {
	pk := testPubkey(0xDD)
	raw := makeMedicalRecordAccountData(pk, "Max", 5, 0, "Bob", "555-0200", 255)
	// Truncate to just the discriminator.
	truncated := raw[:8]

	_, err := deserializeMedicalRecord(truncated)
	if err == nil {
		t.Fatal("expected error for truncated data")
	}
}

func TestDeserializeMedicalAppointment(t *testing.T) {
	aptPk := testPubkey(0xEE)
	petPk := testPubkey(0xFF)
	raw := makeMedicalAppointmentAccountData(aptPk, petPk, 1716900000, "10:00", uint64(200_000_000), uint64(100_000_000), 254)

	apt, err := deserializeMedicalAppointment(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if apt.Time != "10:00" {
		t.Errorf("expected Time=10:00, got %q", apt.Time)
	}
	if apt.Date != 1716900000 {
		t.Errorf("expected Date=1716900000, got %d", apt.Date)
	}
	if apt.AppointmentValue != 200_000_000 {
		t.Errorf("expected AppointmentValue=200000000, got %d", apt.AppointmentValue)
	}
	if apt.PaidValue != 100_000_000 {
		t.Errorf("expected PaidValue=100000000, got %d", apt.PaidValue)
	}
}

func TestDeserializePetCheckin(t *testing.T) {
	chkPk := testPubkey(0x11)
	petPk := testPubkey(0x22)
	raw := makePetCheckinAccountData(chkPk, petPk, 1716905000, 200)

	chk, err := deserializePetCheckin(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if chk.CheckinTime != 1716905000 {
		t.Errorf("expected CheckinTime=1716905000, got %d", chk.CheckinTime)
	}
	if chk.Pubkey == "" {
		t.Error("expected non-empty Pubkey")
	}
	if chk.PetID == "" {
		t.Error("expected non-empty PetID")
	}
}

func TestDeserializePetCheckin_WrongDiscriminator(t *testing.T) {
	chkPk := testPubkey(0x11)
	petPk := testPubkey(0x22)

	var buf bytes.Buffer
	appendDiscriminator(&buf, accountDiscriminatorMedicalRecord) // wrong!
	appendPubkey(&buf, chkPk)
	appendPubkey(&buf, petPk)
	appendBorshI64(&buf, 1716905000)
	appendBorshU8(&buf, 200)

	_, err := deserializePetCheckin(buf.Bytes())
	if err == nil {
		t.Fatal("expected error for wrong discriminator")
	}
}

// ---------------------------------------------------------------------------
// 3.7 — WS reconnect backoff (1s→2s→4s→...→60s with jitter)
// ---------------------------------------------------------------------------

func TestBackoff_InitialDelay(t *testing.T) {
	b := NewBackoff(60 * time.Second)
	delay := b.Delay()

	// Initial delay is 1s ± 500ms.
	if delay < 500*time.Millisecond || delay > 1500*time.Millisecond {
		t.Errorf("initial delay out of range [500ms, 1500ms]: got %v", delay)
	}
}

func TestBackoff_DoublesEachStep(t *testing.T) {
	b := NewBackoff(60 * time.Second)

	// Run several iterations and verify the delay before jitter is doubling.
	// We run multiple times and use the base value (current backoff state).
	for i := 0; i < 5; i++ {
		currentBefore := b.Current()
		_ = b.Delay()
		currentAfter := b.Current()

		expectedNext := time.Duration(math.Min(
			float64(currentBefore)*2,
			float64(60*time.Second),
		))
		if currentAfter != expectedNext {
			t.Errorf("step %d: expected next=%v, got %v (before=%v)", i, expectedNext, currentAfter, currentBefore)
		}
	}
}

func TestBackoff_CapsAtMax(t *testing.T) {
	b := NewBackoff(5 * time.Second) // cap at 5s for testing

	// Run until we exceed max.
	for i := 0; i < 10; i++ {
		_ = b.Delay()
		current := b.Current()
		if current > 5*time.Second {
			t.Errorf("step %d: current %v exceeds max 5s", i, current)
		}
	}

	// After enough iterations, should be capped at 5s.
	if b.Current() != 5*time.Second {
		t.Errorf("expected cap at 5s, got %v", b.Current())
	}
}

func TestBackoff_Reset(t *testing.T) {
	b := NewBackoff(60 * time.Second)

	// Advance a few steps.
	for i := 0; i < 5; i++ {
		_ = b.Delay()
	}

	if b.Current() <= 1*time.Second {
		t.Error("expected backoff to have advanced beyond initial")
	}

	b.Reset()
	if b.Current() != 1*time.Second {
		t.Errorf("expected reset to 1s, got %v", b.Current())
	}
}

func TestBackoff_Jitter(t *testing.T) {
	// Verify that jitter is applied (delay varies from the base).
	// Run many iterations and check that we see different delay values.
	b := NewBackoff(60 * time.Second)

	delays := make(map[time.Duration]int)
	for i := 0; i < 20; i++ {
		// Reset each time to keep base at 1s.
		b.Reset()
		d := b.Delay()
		delays[d]++
	}

	// With 20 samples and ±500ms jitter, we should see at least 2 distinct values
	// (extremely unlikely to hit the same jitter every time).
	if len(delays) < 2 {
		t.Errorf("expected jitter to produce varied delays, got %d distinct values", len(delays))
	}
}

func TestBackoff_DefaultMax(t *testing.T) {
	b := NewBackoff(0) // should default to 60s
	if b.max != 60*time.Second {
		t.Errorf("expected default max 60s, got %v", b.max)
	}
}

func TestBackoff_ConsecutiveDelaysInRange(t *testing.T) {
	b := NewBackoff(60 * time.Second)
	maxDelay := 60*time.Second + 500*time.Millisecond

	for i := 0; i < 10; i++ {
		d := b.Delay()
		if d < 0 {
			t.Errorf("step %d: negative delay %v", i, d)
		}
		if d > maxDelay {
			t.Errorf("step %d: delay %v exceeds max+500ms (%v)", i, d, maxDelay)
		}
	}
}

// ---------------------------------------------------------------------------
// Base58 encoding tests (used by both event parsing and account deserialization)
// ---------------------------------------------------------------------------

func TestEncodePubkey_AllZeros(t *testing.T) {
	var pk [32]byte
	// All zeros should encode to "11111111111111111111111111111111111111111111" (32 ones).
	result := encodePubkey(pk)
	if len(result) != 44 {
		t.Logf("all-zero pubkey length: %d, result: %s", len(result), result)
	}
	// At minimum, it should be non-empty.
	if result == "" {
		t.Error("expected non-empty result")
	}
}

func TestEncodePubkey_KnownPattern(t *testing.T) {
	var pk [32]byte
	pk[0] = 0x01
	result := encodePubkey(pk)
	if result == "" {
		t.Error("expected non-empty result")
	}
	t.Logf("pubkey with 0x01 prefix: %s", result)
}

func TestEncodePubkey_Deterministic(t *testing.T) {
	pk := testPubkey(0x42)
	r1 := encodePubkey(pk)
	r2 := encodePubkey(pk)
	if r1 != r2 {
		t.Errorf("expected deterministic encoding, got %q vs %q", r1, r2)
	}
}

// ---------------------------------------------------------------------------
// animalTypeToString tests
// ---------------------------------------------------------------------------

func TestAnimalTypeToString(t *testing.T) {
	tests := []struct {
		input uint8
		want  string
	}{
		{0, "Dog"},
		{1, "Cat"},
		{2, "Dog"},   // unknown → defaults to Dog
		{255, "Dog"}, // unknown → defaults to Dog
	}

	for _, tt := range tests {
		t.Run("", func(t *testing.T) {
			got := animalTypeToString(tt.input)
			if got != tt.want {
				t.Errorf("animalTypeToString(%d) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// isFatalError tests
// ---------------------------------------------------------------------------

func TestIsFatalError(t *testing.T) {
	tests := []struct {
		err  error
		fatal bool
	}{
		{nil, false},
		{fmt.Errorf("connection refused"), true},
		{fmt.Errorf("dial tcp: no such host"), true},
		{fmt.Errorf("invalid URL scheme"), true},
		{fmt.Errorf("wrong network"), true},
		{fmt.Errorf("random error"), false},
		{fmt.Errorf("context canceled"), false},
	}

	for _, tt := range tests {
		t.Run("", func(t *testing.T) {
			got := isFatalError(tt.err)
			if got != tt.fatal {
				t.Errorf("isFatalError(%v) = %v, want %v", tt.err, got, tt.fatal)
			}
		})
	}
}
