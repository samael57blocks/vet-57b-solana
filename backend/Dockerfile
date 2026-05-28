# Multi-stage Docker build for vet-57b backend service.
#
# Build stage: golang:1.23-alpine compiles the binary.
# Runtime stage: alpine:3.20 provides a minimal execution environment.
#
# Design decisions:
#   - No ca-certificates needed (no outbound HTTPS from the binary itself).
#   - Healthcheck via GET /health (implemented in the REST API layer).
#   - The binary is at /app/server and runs as non-root user "nobody".
#   - Environment variables are injected at runtime, not build time.

# -----------------------
# Stage 1: Build
# -----------------------
FROM golang:1.23-alpine AS build

RUN apk add --no-cache gcc musl-dev

WORKDIR /src

# Cache dependencies first (separate layer for Docker cache efficiency).
COPY go.mod go.sum ./
RUN go mod download

# Copy source and compile.
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /app/server ./cmd/server/

# -----------------------
# Stage 2: Runtime
# -----------------------
FROM alpine:3.20 AS runtime

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Copy the compiled binary from the build stage.
COPY --from=build /app/server .

# Copy SQL migrations for embedded execution at startup.
COPY --from=build /src/internal/db/migrations ./internal/db/migrations

# Run as non-root user for security.
USER nobody

EXPOSE 4000

# Healthcheck: relies on GET /health endpoint from chi router.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

ENTRYPOINT ["/app/server"]
