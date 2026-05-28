package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/57blocks/vet-57b-backend/internal/models"
)

// ---------------------------------------------------------------------------
// Mock Querier
// ---------------------------------------------------------------------------

// mockQuerier implements Querier with configurable function fields for testing.
type mockQuerier struct {
	listPetsFn         func(context.Context) ([]models.Pet, error)
	getPetFn           func(context.Context, string) (*models.Pet, error)
	listAppointmentsFn func(context.Context, string) ([]models.Appointment, error)
	getAppointmentFn   func(context.Context, string) (*models.Appointment, error)
	listCheckinsFn     func(context.Context, string) ([]models.Checkin, error)
	petExistsFn        func(context.Context, string) (bool, error)
}

func (m *mockQuerier) ListPets(ctx context.Context) ([]models.Pet, error) {
	return m.listPetsFn(ctx)
}
func (m *mockQuerier) GetPet(ctx context.Context, id string) (*models.Pet, error) {
	return m.getPetFn(ctx, id)
}
func (m *mockQuerier) ListAppointments(ctx context.Context, petID string) ([]models.Appointment, error) {
	return m.listAppointmentsFn(ctx, petID)
}
func (m *mockQuerier) GetAppointment(ctx context.Context, id string) (*models.Appointment, error) {
	return m.getAppointmentFn(ctx, id)
}
func (m *mockQuerier) ListCheckins(ctx context.Context, petID string) ([]models.Checkin, error) {
	return m.listCheckinsFn(ctx, petID)
}
func (m *mockQuerier) PetExists(ctx context.Context, id string) (bool, error) {
	return m.petExistsFn(ctx, id)
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

var sampleTime = time.Date(2026, 5, 28, 12, 0, 0, 0, time.UTC)

func samplePet() models.Pet {
	return models.Pet{
		ID:             "pet-abc",
		Name:           "Rex",
		Age:            3,
		AnimalType:     "Dog",
		CaretakerName:  "Alice",
		CaretakerPhone: "555-0100",
		CreatedAt:      sampleTime,
	}
}

func sampleAppointment() models.Appointment {
	return models.Appointment{
		ID:               "apt-001",
		PetID:            "pet-abc",
		Date:             sampleTime,
		Time:             "14:30",
		AppointmentValue: 100_000_000,
		PaidValue:        50_000_000,
		CreatedAt:        sampleTime,
	}
}

func sampleCheckin() models.Checkin {
	return models.Checkin{
		ID:          "chk-001",
		PetID:       "pet-abc",
		CheckinTime: sampleTime,
		CreatedAt:   sampleTime,
	}
}

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------

func TestHealth(t *testing.T) {
	mock := &mockQuerier{
		listPetsFn: func(ctx context.Context) ([]models.Pet, error) { return nil, nil },
	}
	srv := httptest.NewServer(NewRouter(mock))
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/health")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	var body map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body["status"] != "ok" {
		t.Errorf("expected status=ok, got %q", body["status"])
	}
}

// ---------------------------------------------------------------------------
// GET /api/v1/pets
// ---------------------------------------------------------------------------

func TestPetsList(t *testing.T) {
	pet := samplePet()

	tests := []struct {
		name       string
		mockFn     func(context.Context) ([]models.Pet, error)
		wantStatus int
		wantLen    int
	}{
		{
			name: "returns list of pets",
			mockFn: func(ctx context.Context) ([]models.Pet, error) {
				return []models.Pet{pet}, nil
			},
			wantStatus: http.StatusOK,
			wantLen:    1,
		},
		{
			name: "returns empty list when no pets",
			mockFn: func(ctx context.Context) ([]models.Pet, error) {
				return []models.Pet{}, nil
			},
			wantStatus: http.StatusOK,
			wantLen:    0,
		},
		{
			name: "returns empty list when nil",
			mockFn: func(ctx context.Context) ([]models.Pet, error) {
				return nil, nil
			},
			wantStatus: http.StatusOK,
			wantLen:    0,
		},
		{
			name: "returns 500 on db error",
			mockFn: func(ctx context.Context) ([]models.Pet, error) {
				return nil, errors.New("db down")
			},
			wantStatus: http.StatusInternalServerError,
			wantLen:    0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &mockQuerier{listPetsFn: tt.mockFn}
			srv := httptest.NewServer(NewRouter(mock))
			defer srv.Close()

			resp, err := http.Get(srv.URL + "/api/v1/pets")
			if err != nil {
				t.Fatal(err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != tt.wantStatus {
				t.Errorf("expected status %d, got %d", tt.wantStatus, resp.StatusCode)
			}

			if tt.wantStatus == http.StatusOK {
				var pets []models.Pet
				if err := json.NewDecoder(resp.Body).Decode(&pets); err != nil {
					t.Fatal(err)
				}
				if len(pets) != tt.wantLen {
					t.Errorf("expected %d pets, got %d", tt.wantLen, len(pets))
				}
			}
		})
	}
}

// ---------------------------------------------------------------------------
// GET /api/v1/pets/{id}
// ---------------------------------------------------------------------------

func TestPetsGet(t *testing.T) {
	pet := samplePet()

	tests := []struct {
		name       string
		id         string
		mockFn     func(context.Context, string) (*models.Pet, error)
		wantStatus int
		wantID     string
	}{
		{
			name: "returns pet when found",
			id:   "pet-abc",
			mockFn: func(ctx context.Context, id string) (*models.Pet, error) {
				return &pet, nil
			},
			wantStatus: http.StatusOK,
			wantID:     "pet-abc",
		},
		{
			name: "returns 404 when not found",
			id:   "pet-xyz",
			mockFn: func(ctx context.Context, id string) (*models.Pet, error) {
				return nil, nil
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "returns 500 on db error",
			id:   "pet-abc",
			mockFn: func(ctx context.Context, id string) (*models.Pet, error) {
				return nil, errors.New("db down")
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &mockQuerier{getPetFn: tt.mockFn}
			srv := httptest.NewServer(NewRouter(mock))
			defer srv.Close()

			resp, err := http.Get(srv.URL + "/api/v1/pets/" + tt.id)
			if err != nil {
				t.Fatal(err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != tt.wantStatus {
				t.Errorf("expected status %d, got %d", tt.wantStatus, resp.StatusCode)
			}

			if tt.wantStatus == http.StatusOK {
				var got models.Pet
				if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
					t.Fatal(err)
				}
				if got.ID != tt.wantID {
					t.Errorf("expected id %q, got %q", tt.wantID, got.ID)
				}
			}

			if tt.wantStatus == http.StatusNotFound {
				var errBody map[string]string
				if err := json.NewDecoder(resp.Body).Decode(&errBody); err != nil {
					t.Fatal(err)
				}
				if errBody["error"] == "" {
					t.Error("expected error message in body")
				}
			}
		})
	}
}

// ---------------------------------------------------------------------------
// GET /api/v1/appointments
// ---------------------------------------------------------------------------

func TestAppointmentsList(t *testing.T) {
	apt := sampleAppointment()

	tests := []struct {
		name       string
		query      string
		mockFn     func(context.Context, string) ([]models.Appointment, error)
		wantStatus int
		wantLen    int
	}{
		{
			name:  "returns all appointments",
			query: "",
			mockFn: func(ctx context.Context, petID string) ([]models.Appointment, error) {
				return []models.Appointment{apt}, nil
			},
			wantStatus: http.StatusOK,
			wantLen:    1,
		},
		{
			name:  "filters by petId",
			query: "?petId=pet-abc",
			mockFn: func(ctx context.Context, petID string) ([]models.Appointment, error) {
				if petID != "pet-abc" {
					t.Errorf("expected petID 'pet-abc', got %q", petID)
				}
				return []models.Appointment{apt}, nil
			},
			wantStatus: http.StatusOK,
			wantLen:    1,
		},
		{
			name:  "returns empty list when none",
			query: "",
			mockFn: func(ctx context.Context, petID string) ([]models.Appointment, error) {
				return []models.Appointment{}, nil
			},
			wantStatus: http.StatusOK,
			wantLen:    0,
		},
		{
			name:  "returns 500 on db error",
			query: "",
			mockFn: func(ctx context.Context, petID string) ([]models.Appointment, error) {
				return nil, errors.New("db down")
			},
			wantStatus: http.StatusInternalServerError,
			wantLen:    0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &mockQuerier{listAppointmentsFn: tt.mockFn}
			srv := httptest.NewServer(NewRouter(mock))
			defer srv.Close()

			resp, err := http.Get(srv.URL + "/api/v1/appointments" + tt.query)
			if err != nil {
				t.Fatal(err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != tt.wantStatus {
				t.Errorf("expected status %d, got %d", tt.wantStatus, resp.StatusCode)
			}

			if tt.wantStatus == http.StatusOK {
				var apts []models.Appointment
				if err := json.NewDecoder(resp.Body).Decode(&apts); err != nil {
					t.Fatal(err)
				}
				if len(apts) != tt.wantLen {
					t.Errorf("expected %d appointments, got %d", tt.wantLen, len(apts))
				}
			}
		})
	}
}

// ---------------------------------------------------------------------------
// GET /api/v1/appointments/{id}
// ---------------------------------------------------------------------------

func TestAppointmentsGet(t *testing.T) {
	apt := sampleAppointment()

	tests := []struct {
		name       string
		id         string
		mockFn     func(context.Context, string) (*models.Appointment, error)
		wantStatus int
		wantID     string
	}{
		{
			name: "returns appointment when found",
			id:   "apt-001",
			mockFn: func(ctx context.Context, id string) (*models.Appointment, error) {
				return &apt, nil
			},
			wantStatus: http.StatusOK,
			wantID:     "apt-001",
		},
		{
			name: "returns 404 when not found",
			id:   "apt-xyz",
			mockFn: func(ctx context.Context, id string) (*models.Appointment, error) {
				return nil, nil
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "returns 500 on db error",
			id:   "apt-001",
			mockFn: func(ctx context.Context, id string) (*models.Appointment, error) {
				return nil, errors.New("db down")
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &mockQuerier{getAppointmentFn: tt.mockFn}
			srv := httptest.NewServer(NewRouter(mock))
			defer srv.Close()

			resp, err := http.Get(srv.URL + "/api/v1/appointments/" + tt.id)
			if err != nil {
				t.Fatal(err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != tt.wantStatus {
				t.Errorf("expected status %d, got %d", tt.wantStatus, resp.StatusCode)
			}

			if tt.wantStatus == http.StatusOK {
				var got models.Appointment
				if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
					t.Fatal(err)
				}
				if got.ID != tt.wantID {
					t.Errorf("expected id %q, got %q", tt.wantID, got.ID)
				}
			}
		})
	}
}

// ---------------------------------------------------------------------------
// GET /api/v1/pets/{id}/checkins
// ---------------------------------------------------------------------------

func TestPetCheckins(t *testing.T) {
	chk := sampleCheckin()

	tests := []struct {
		name          string
		id            string
		petExistsFn   func(context.Context, string) (bool, error)
		listCheckinsFn func(context.Context, string) ([]models.Checkin, error)
		wantStatus    int
		wantLen       int
	}{
		{
			name: "returns checkins when pet exists",
			id:   "pet-abc",
			petExistsFn: func(ctx context.Context, id string) (bool, error) {
				return true, nil
			},
			listCheckinsFn: func(ctx context.Context, petID string) ([]models.Checkin, error) {
				return []models.Checkin{chk}, nil
			},
			wantStatus: http.StatusOK,
			wantLen:    1,
		},
		{
			name: "returns empty array when no checkins",
			id:   "pet-abc",
			petExistsFn: func(ctx context.Context, id string) (bool, error) {
				return true, nil
			},
			listCheckinsFn: func(ctx context.Context, petID string) ([]models.Checkin, error) {
				return []models.Checkin{}, nil
			},
			wantStatus: http.StatusOK,
			wantLen:    0,
		},
		{
			name: "returns 404 when pet does not exist",
			id:   "pet-xyz",
			petExistsFn: func(ctx context.Context, id string) (bool, error) {
				return false, nil
			},
			listCheckinsFn: func(ctx context.Context, petID string) ([]models.Checkin, error) {
				return nil, nil
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "returns 500 on pet exists db error",
			id:   "pet-abc",
			petExistsFn: func(ctx context.Context, id string) (bool, error) {
				return false, errors.New("db down")
			},
			listCheckinsFn: func(ctx context.Context, petID string) ([]models.Checkin, error) {
				return nil, nil
			},
			wantStatus: http.StatusInternalServerError,
		},
		{
			name: "returns 500 on checkins db error",
			id:   "pet-abc",
			petExistsFn: func(ctx context.Context, id string) (bool, error) {
				return true, nil
			},
			listCheckinsFn: func(ctx context.Context, petID string) ([]models.Checkin, error) {
				return nil, errors.New("db down")
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &mockQuerier{
				petExistsFn:    tt.petExistsFn,
				listCheckinsFn: tt.listCheckinsFn,
			}
			srv := httptest.NewServer(NewRouter(mock))
			defer srv.Close()

			resp, err := http.Get(srv.URL + "/api/v1/pets/" + tt.id + "/checkins")
			if err != nil {
				t.Fatal(err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != tt.wantStatus {
				t.Errorf("expected status %d, got %d", tt.wantStatus, resp.StatusCode)
			}

			if tt.wantStatus == http.StatusOK {
				var checkins []models.Checkin
				if err := json.NewDecoder(resp.Body).Decode(&checkins); err != nil {
					t.Fatal(err)
				}
				if len(checkins) != tt.wantLen {
					t.Errorf("expected %d checkins, got %d", tt.wantLen, len(checkins))
				}
			}

			if tt.wantStatus == http.StatusNotFound {
				var errBody map[string]string
				if err := json.NewDecoder(resp.Body).Decode(&errBody); err != nil {
					t.Fatal(err)
				}
				if errBody["error"] == "" {
					t.Error("expected error message in body")
				}
			}
		})
	}
}

// Compile-time interface check.
var _ Querier = (*mockQuerier)(nil)
