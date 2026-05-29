package api

// Checkin-related handler is implemented as PetsResource.Checkins in pets.go.
//
// The checkins endpoint (GET /api/v1/pets/{id}/checkins) is nested under the
// pets resource because it returns checkins for a specific pet. It is defined
// as a method on PetsResource rather than as a separate resource.
//
// This file exists as a documentation placeholder per the task structure:
//   - Task 2.4: Create internal/api/checkins.go
//
// The actual handler logic lives in pets.go under PetsResource.Checkins.
