# ADR 0004: Listening Behaviour Tracking & Event Ingestion Architecture

## Status
Accepted

## Context
TuneSense's academic thesis centers on personalized, context-aware music discovery and explainable recommendations. To power future recommendation engines (collaborative filtering, implicit feedback matrix factorization, and context-dependent scoring), the application requires structured telemetry capturing actual listening interactions. Rather than relying on explicit user reviews, implicit interactions (`play`, `pause`, `skip`, `complete`) provide clean, continuous behavioral signals.

---

## Decisions

### 1. Dedicated Event Ingestion Pipeline
- **Decision:** Build a lightweight, non-blocking telemetry pipeline that bridges audio player events to MongoDB:
  ```
  User Interaction → AudioPlayerContext → listeningEventService → POST /api/listening-events → requireAuth → ListeningEventService → MongoDB
  ```
- **Rationale:** Separates playback presentation from event telemetry. Decouples client audio controls from backend persistence without blocking music playback or degrading responsive UI.

### 2. Strict Authenticated Ingestion Boundary
- **Decision:** Listening events are only ingested for authenticated users. The endpoint `POST /api/listening-events` enforces `requireAuth` middleware.
- **Security Invariant:** The `userId` is strictly extracted from verified JWT credentials (`req.user.id`). Any client-supplied `userId` field is explicitly ignored and rejected.
- **Unauthenticated Handling:** Guests and unauthenticated sessions can freely browse and play music, but no listening events are emitted or persisted.

### 3. Canonical Event Types
- **Decision:** Support four fundamental behavioral signals:
  - `play`: Emitted on playback initiation or starting a new track. Deduplicated to prevent multiple play events for continuous listening.
  - `pause`: Emitted when user temporarily halts playback. Captures position, duration, and completion percentage.
  - `skip`: Emitted when user abandons a track prior to meaningful completion (< 95% completion ratio) to transition to another track.
  - `complete`: Emitted when track naturally finishes playback (100% completion). Deduplicated per playback session instance.
- **Exclusion of Seek:** Seeking updates playback position within `AudioPlayerContext` but does not trigger independent events. The next pause, skip, or complete captures the updated timestamp.

### 4. Telemetry & Contextual Dimensions
- **Decision:** Capture essential behavioral and temporal dimensions without violating privacy:
  - **Temporal Context:** `timeOfDay` (`morning`, `afternoon`, `evening`, `late_night`) and `dayOfWeek` derived from user local time.
  - **Session Tracking:** A persistent, anonymous `sessionId` generated per browser session in `sessionStorage` that survives multiple track plays.
  - **Device Category:** High-level coarse categorization (`mobile`, `tablet`, `desktop`) derived from viewport geometry.
  - **Playback Metrics:** `positionSeconds`, `durationSeconds`, clamped `completionPercent` (0–100), and `completionRate` (0–1).

### 5. Song Existence Verification
- **Decision:** Before a `ListeningEvent` is committed to MongoDB, `ListeningEventService` verifies that the target song exists in the database.
- **Rationale:** Prevents dangling or orphaned event documents referencing invalid identifiers. If a song cannot be found, a clean `404 Not Found` with code `SONG_NOT_FOUND` is returned.

### 6. Non-Blocking Client Network Policy
- **Decision:** Tracking dispatches are asynchronous and non-blocking in `listeningEventService`.
- **Rationale:** Network latency or temporary tracking failures must never stutter, interrupt, or stop audio playback.

### 7. Explicit Scope Boundary: No Recommendations in Stage 5
- **Decision:** Recommendation calculations, algorithmic models, playlists, and analytics dashboards are strictly deferred to future stages.
- **Rationale:** Stage 5 focuses purely on collecting high-fidelity, validated behavioral event records. Mixing recommendation algorithms into data collection would violate stage modularity.

---

## Consequences
- Every authenticated song play, pause, skip, and complete produces a valid, queryable MongoDB document.
- In-memory event deduplication ensures no duplicate event storms from React re-renders.
