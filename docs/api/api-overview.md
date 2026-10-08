# TuneSense API Overview

## Base URL
- Development: `http://localhost:5000/api`
- Production: `https://<api-domain>/api`

---

## Response Format

### Standard Success Response
```json
{
  "status": "ok",
  "data": { ... }
}
```

### Standard Error Response
```json
{
  "error": {
    "message": "Human-readable error description",
    "code": "ERROR_CODE",
    "details": [ ... ]
  }
}
```

---

## Implemented Endpoints

### 1. Health Check (Stage 1 & 2 Implemented)
- **Route:** `GET /api/health`
- **Description:** Verifies server runtime availability, service status, environment, and database connectivity.
- **Authentication:** Public
- **Response `200 OK`:**
```json
{
  "status": "ok",
  "service": "tunesense-api",
  "timestamp": "2026-10-08T06:00:42.833Z",
  "environment": "development",
  "database": "connected"
}
```

---

### 2. Music Catalogue Search (Stage 3 Implemented)
- **Route:** `GET /api/music/search`
- **Query Parameters:**
  - `q` (*required*, string): Keyword to search for (song title, artist name).
  - `limit` (*optional*, integer, 1–50, default: 20): Number of items per page.
  - `offset` (*optional*, integer, default: 0): Result offset for pagination.
- **Validation:** Returns `400 Bad Request` if `q` is missing or empty.
- **Response `200 OK`:**
```json
{
  "status": "ok",
  "data": {
    "query": "chill",
    "tracks": [
      {
        "id": "670498b...",
        "title": "Midnight Resonance",
        "artistId": "670498a...",
        "artistName": "Astral Wave",
        "albumId": "670498c...",
        "albumTitle": "Zero Gravity",
        "durationSeconds": 214,
        "artworkUrl": "https://usercontent.jamendo.com?...",
        "streamUrl": "https://prod-1.storage.jamendo.com/...",
        "genres": ["electronic", "ambient"],
        "languages": ["en"],
        "provider": "jamendo",
        "providerTrackId": "1884481"
      }
    ],
    "artists": [ ... ],
    "albums": [ ... ],
    "totalResults": 1
  }
}
```

---

### 3. Popular / Featured Music (Stage 3 Implemented)
- **Route:** `GET /api/music/popular`
- **Query Parameters:**
  - `limit` (*optional*, integer, 1–50, default: 20): Number of popular tracks to retrieve.
- **Response `200 OK`:** Returns array of popular catalogue tracks.

---

### 4. Track Details (Stage 3 Implemented)
- **Route:** `GET /api/music/tracks/:id`
- **Parameters:**
  - `id`: MongoDB ObjectId or external provider track ID.
- **Error Behavior:** Returns `404 Not Found` if the track cannot be located in the catalogue.

---

### 5. Playable Stream URL (Stage 3 Implemented)
- **Route:** `GET /api/music/tracks/:id/stream`
- **Parameters:**
  - `id`: MongoDB ObjectId or external provider track ID.
- **Response `200 OK`:**
```json
{
  "status": "ok",
  "data": {
    "providerTrackId": "1884481",
    "streamUrl": "https://prod-1.storage.jamendo.com/?trackid=1884481&format=mp32",
    "format": "mp32"
  }
}
```
- **Error Behavior:** Returns `404 Not Found` with `STREAM_UNAVAILABLE` if audio stream cannot be resolved.

---

### 6. Artist Details (Stage 3 Implemented)
- **Route:** `GET /api/music/artists/:id`
- **Parameters:**
  - `id`: MongoDB ObjectId or external provider artist ID.
- **Response `200 OK`:** Returns normalized `ProviderArtist` object.

---

### 7. Album Details (Stage 3 Implemented)
- **Route:** `GET /api/music/albums/:id`
- **Parameters:**
  - `id`: MongoDB ObjectId or external provider album ID.
- **Response `200 OK`:** Returns normalized `ProviderAlbum` object.

---

---

### 8. User Authentication & Identity (Stage 4 Implemented)

#### POST /api/auth/signup
- **Description:** Registers a new TuneSense user account, creates a default `UserPreference` record, and issues an authenticated session via HTTP-only cookie.
- **Authentication:** Public
- **Request Body:**
```json
{
  "name": "Alex Parker",
  "email": "alex@example.com",
  "password": "securePassword123"
}
```
- **Validation:**
  - `name`: 2–60 characters.
  - `email`: valid email address format (normalized to lowercase).
  - `password`: minimum 8 characters.
- **Response `201 Created`:**
```json
{
  "user": {
    "id": "670498b...",
    "name": "Alex Parker",
    "email": "alex@example.com",
    "createdAt": "2026-10-08T06:20:00.000Z",
    "updatedAt": "2026-10-08T06:20:00.000Z"
  },
  "message": "User created successfully"
}
```
- **Sets Cookie:** `tunesense_token` (`HttpOnly`, `Path=/`, `SameSite=Lax`, `Max-Age=7d`).
- **Error Codes:**
  - `400 Bad Request` — Validation failure (invalid email, short password).
  - `409 Conflict` — Email is already registered.

#### POST /api/auth/login
- **Description:** Authenticates user credentials and issues an authenticated session via HTTP-only cookie.
- **Authentication:** Public
- **Request Body:**
```json
{
  "email": "alex@example.com",
  "password": "securePassword123"
}
```
- **Response `200 OK`:**
```json
{
  "user": {
    "id": "670498b...",
    "name": "Alex Parker",
    "email": "alex@example.com",
    "createdAt": "2026-10-08T06:20:00.000Z",
    "updatedAt": "2026-10-08T06:20:00.000Z"
  },
  "message": "Login successful"
}
```
- **Sets Cookie:** `tunesense_token` (`HttpOnly`).
- **Error Codes:**
  - `401 Unauthorized` — Invalid email or password.

#### POST /api/auth/logout
- **Description:** Terminates the current session by clearing the `tunesense_token` cookie.
- **Authentication:** Public / Authenticated
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```
- **Clears Cookie:** `tunesense_token`.

#### GET /api/auth/me
- **Description:** Retrieves the authenticated user profile from MongoDB using the verified JWT in the cookie.
- **Authentication:** Required (`requireAuth` middleware).
- **Response `200 OK`:**
```json
{
  "user": {
    "id": "670498b...",
    "name": "Alex Parker",
    "email": "alex@example.com",
    "createdAt": "2026-10-08T06:20:00.000Z",
    "updatedAt": "2026-10-08T06:20:00.000Z"
  }
}
```
- **Error Codes:**
  - `401 Unauthorized` — Missing, expired, or invalid authentication cookie.

---

### 9. Listening Events Ingestion (Stage 5 Implemented)

#### POST /api/listening-events
- **Description:** Ingests structured listening behavior for the authenticated user, validating track existence, calculating completion rates, and appending rich contextual metadata.
- **Authentication:** Required (`requireAuth` middleware). The user ID is strictly extracted from the JWT session cookie (`req.user.id`).
- **Request Body:**
```json
{
  "songId": "670498b...",
  "eventType": "play",
  "timestamp": "2026-10-08T08:30:00.000Z",
  "playback": {
    "positionSeconds": 15,
    "durationSeconds": 240,
    "completionPercent": 6.25,
    "playbackSpeed": 1.0
  },
  "context": {
    "sessionId": "sess_8f29c_m0k3",
    "timeOfDay": "evening",
    "dayOfWeek": "friday",
    "deviceType": "mobile"
  }
}
```
- **Validation Rules:**
  - `songId`: required, non-empty, must exist in MongoDB.
  - `eventType`: strictly one of `'play'`, `'pause'`, `'skip'`, `'complete'`.
  - `playback.positionSeconds`: number >= 0.
  - `playback.durationSeconds`: number >= 0.
  - `playback.completionPercent`: number between 0 and 100.
  - `context.timeOfDay`: `'morning'`, `'afternoon'`, `'evening'`, `'late_night'`, `'night'`, `'unknown'`.
- **Response `201 Created`:**
```json
{
  "status": "ok",
  "data": {
    "id": "670560a...",
    "userId": "670498b...",
    "songId": "670498b...",
    "eventType": "play",
    "timestamp": "2026-10-08T08:30:00.000Z",
    "playback": {
      "positionSeconds": 15,
      "durationSeconds": 240,
      "completionPercent": 6.25
    },
    "context": {
      "sessionId": "sess_8f29c_m0k3",
      "timeOfDay": "evening",
      "dayOfWeek": "friday",
      "deviceType": "mobile"
    }
  }
}
```
- **Error Codes:**
  - `400 Bad Request` — Validation failure (invalid event type, negative position).
  - `401 Unauthorized` — Missing or invalid authentication session cookie.
  - `404 Not Found` — Referenced song does not exist in catalogue (`code: SONG_NOT_FOUND`).

---

---

### 10. User Taste Profile Intelligence (Stage 6 Implemented)

#### GET /api/profile/taste
- **Description:** Retrieves the computed, explainable taste profile for the authenticated user, distinguishing long-term taste from recent (30-day) taste, trends, and behavioural metrics.
- **Authentication:** Required (`requireAuth`). Derived strictly from the verified JWT cookie (`req.user.id`).
- **Response `200 OK`:**
```json
{
  "status": "ok",
  "data": {
    "userId": "670498b...",
    "profileVersion": 1,
    "profileConfidence": 0.85,
    "longTerm": {
      "genres": [
        { "genre": "electronic", "score": 1.0 },
        { "genre": "synthwave", "score": 0.72 }
      ],
      "artists": [
        { "artistId": "670498a...", "score": 1.0 }
      ],
      "languages": [
        { "language": "en", "score": 1.0 }
      ],
      "audioFeatures": {
        "energy": 0.78,
        "danceability": 0.65,
        "valence": 0.58,
        "tempo": 124.0,
        "acousticness": 0.18,
        "instrumentalness": 0.82
      }
    },
    "recent": {
      "genres": [
        { "genre": "electronic", "score": 1.0 },
        { "genre": "lo-fi", "score": 0.84 }
      ],
      "artists": [ ... ],
      "languages": [ ... ],
      "audioFeatures": { ... }
    },
    "trends": {
      "genres": [
        { "genre": "lo-fi", "delta": 0.35, "direction": "rising" },
        { "genre": "pop", "delta": -0.22, "direction": "declining" }
      ]
    },
    "behaviour": {
      "totalEvents": 48,
      "playCount": 24,
      "pauseCount": 6,
      "skipCount": 4,
      "completeCount": 14,
      "skipRate": 0.0833,
      "completionRate": 0.2917,
      "averageCompletionPercent": 71.4,
      "totalListeningDurationSeconds": 4820
    },
    "context": {
      "timeOfDay": {
        "morning": 0.15,
        "afternoon": 0.25,
        "evening": 0.50,
        "late_night": 0.10,
        "unknown": 0.0
      },
      "dayOfWeek": {
        "friday": 0.35,
        "saturday": 0.25, ...
      }
    },
    "metadata": {
      "calculatedAt": "2026-10-08T11:30:00.000Z",
      "eventCountUsed": 48,
      "uniqueSongsCount": 22,
      "uniqueArtistsCount": 12,
      "recentWindowDays": 30
    }
  }
}
```
- **Error Codes:**
  - `401 Unauthorized` — Missing or invalid authentication session cookie.
  - `403 Forbidden` — Attempting to query another user's profile.

#### POST /api/profile/taste/rebuild
- **Description:** Triggers a deterministic rebuild of the user's taste profile materialized view by evaluating all underlying `ListeningEvent` records with recency decay.
- **Authentication:** Required (`requireAuth`).
- **Response `200 OK`:** Returns updated `UserTasteProfileDto`.
- **Error Codes:**
  - `401 Unauthorized` — Unauthenticated session.
  - `503 Service Unavailable` — MongoDB disconnected in degraded mode.

---

### 10. Recommendation Engine (Stage 7 Implemented)

#### GET /api/recommendations
- **Description:** Retrieves ranked, diverse, explainable music recommendations for the authenticated user using modular strategy pipelines (R0 Popularity, R1 Content, R2 Behaviour, R3 Context, R4 Hybrid, Standalone Collaborative, and R5 Collaborative Hybrid) with real-time mood-aware modulation and collaborative filtering signals.
- **Authentication:** Required (`requireAuth`). Identity strictly resolved from JWT cookie or Bearer token (`req.user.id`).
- **Query Parameters:**
  - `limit` (*optional*, integer: 1–20, default: 10): Number of recommendations to return.
  - `strategy` (*optional*, string: `'popularity' | 'content' | 'behaviour' | 'context' | 'hybrid' | 'collaborative' | 'collaborativeHybrid'`, default: `'hybrid'`): Explicit scoring strategy layer to evaluate.
  - `mood` (*optional*, string: `'happy' | 'energetic' | 'relaxed' | 'focused' | 'romantic' | 'sad' | 'calm' | 'nostalgic'`): Explicit listening vibe to dynamically adjust acoustic scoring weights.
- **Anti-Spoofing:** Querying `userId` for another user immediately returns `403 Forbidden`.
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "strategy": "collaborativeHybrid",
    "generatedAt": "2026-10-08T11:53:53.648Z",
    "confidence": 0.85,
    "activeMood": "energetic",
    "totalCandidatesEvaluated": 45,
    "recommendations": [
      {
        "song": {
          "id": "670498b...",
          "title": "Midnight Resonance",
          "artistId": "670498a...",
          "artistName": "Astral Wave",
          "albumTitle": "Neon Horizon",
          "durationSeconds": 214,
          "artworkUrl": "https://usercontent.jamendo.com?...",
          "streamUrl": "https://prod-1.storage.jamendo.com/...",
          "genres": ["electronic", "ambient"],
          "languages": ["en"],
          "provider": "jamendo",
          "providerTrackId": "1884481"
        },
        "score": 0.88,
        "reason": "Listeners with tastes similar to yours enjoyed this",
        "reasonType": "collaborative",
        "components": {
          "popularity": 0.75,
          "content": 0.90,
          "behaviour": 0.82,
          "context": 0.78,
          "novelty": 0.80,
          "mood": 0.94,
          "collaborative": 0.86
        }
      }
    ]
  }
}
```
- **Error Codes:**
  - `400 Bad Request` — Invalid strategy requested.
  - `401 Unauthorized` — Missing or expired authentication token.
  - `403 Forbidden` — Attempting to request recommendations for another user ID.

---

### 11. User Preferences & Personalization Controls (Stage 8 Implemented)

#### GET /api/preferences
- **Description:** Retrieves explicit user music preferences, negative preferences (dislikes), and exploration/diversity controls for the authenticated user.
- **Authentication:** Required (`requireAuth`). Identity strictly resolved from authenticated JWT (`req.user.id`).
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "preferredGenres": ["electronic", "ambient"],
    "preferredArtists": ["Astral Wave"],
    "preferredLanguages": ["en", "instrumental"],
    "dislikedGenres": ["screamo"],
    "dislikedArtists": [],
    "preferredEnergy": 0.75,
    "preferredMood": "energetic",
    "favoriteGenres": ["electronic", "ambient"],
    "favoriteArtists": ["Astral Wave"],
    "personalizationSettings": {
      "explorationLevel": 0.5,
      "diversityLevel": 0.7
    },
    "updatedAt": "2026-10-08T12:00:00.000Z"
  }
}
```
- **Error Codes:**
  - `401 Unauthorized` — Missing or invalid authentication token.

#### PUT /api/preferences
- **Description:** Updates explicit user music preferences, negative preferences, and personalization controls. Validated with Zod.
- **Authentication:** Required (`requireAuth`). Identity strictly resolved from authenticated JWT (`req.user.id`).
- **Anti-Spoofing:** Passing a mismatched `userId` in the body returns `403 Forbidden`.
- **Request Body:**
```json
{
  "preferredGenres": ["Electronic", "Ambient", "Synthwave"],
  "preferredLanguages": ["en"],
  "preferredArtists": ["Tycho"],
  "dislikedGenres": ["Screamo"],
  "dislikedArtists": [],
  "preferredMood": "focused",
  "personalizationSettings": {
    "explorationLevel": 0.65,
    "diversityLevel": 0.8
  }
}
```
- **Validation Rules:**
  - `preferredGenres`: optional array of strings (max 50 each).
  - `dislikedGenres`: optional array of strings.
  - `preferredMood`: optional string matching one of the 8 controlled moods.
  - `personalizationSettings.explorationLevel`: float between 0.0 and 1.0.
  - `personalizationSettings.diversityLevel`: float between 0.0 and 1.0.
- **Response `200 OK`:** Returns updated `UserPreferenceDto`.
- **Error Codes:**
  - `400 Bad Request` — Schema validation failed (e.g., exploration level > 1.0).
  - `401 Unauthorized` — Missing authentication token.
  - `403 Forbidden` — IDOR attempt with mismatched userId.

---

### 8. Analytics Endpoints (Stage 9 Implemented)

#### GET /api/analytics/me
- **Description:** Returns detailed user-level listening analytics aggregated across `ListeningEvent` history.
- **Authentication:** Required (`requireAuth`).
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "totalPlays": 42,
    "completedTracks": 28,
    "skippedTracks": 14,
    "completionRate": 0.667,
    "skipRate": 0.333,
    "averageCompletionPercent": 78,
    "listeningMinutes": 145.2,
    "uniqueSongs": 31,
    "uniqueArtists": 12,
    "uniqueGenres": 6,
    "topArtists": [
      { "artistId": "...", "artistName": "Synth Masters", "playCount": 18 }
    ],
    "topGenres": [
      { "genre": "electronic", "playCount": 24 }
    ],
    "timeOfDayDistribution": { "morning": 10, "evening": 32 },
    "dayOfWeekDistribution": { "friday": 20, "saturday": 22 },
    "recentActivity": [
      { "date": "2026-10-08", "playCount": 8, "completionCount": 6 }
    ]
  }
}
```

#### GET /api/analytics/recommendations
- **Description:** Returns aggregate recommendation exposure, play-through conversion, completion rate, and mood-specific engagement.
- **Authentication:** Required (`requireAuth`).
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "totalImpressions": 80,
    "recommendationPlays": 24,
    "recommendationCompletions": 18,
    "recommendationSkips": 6,
    "playThroughRate": 0.300,
    "completionRate": 0.750,
    "skipRate": 0.250,
    "averagePosition": 2.1,
    "strategyDistribution": { "hybrid": 80, "collaborativeHybrid": 30 },
    "collaborativeMetrics": {
      "collaborativeCandidateRatio": 0.45,
      "collaborativePlayThroughRate": 0.38,
      "collaborativeCompletionRate": 0.72,
      "collaborativeNovelty": 0.65,
      "avgSupportCount": 2.4,
      "confidenceDistribution": {
        "low": 2,
        "medium": 8,
        "high": 14
      }
    },
    "moodPerformance": [
      { "mood": "energetic", "impressions": 40, "plays": 16, "playThroughRate": 0.400 }
    ],
    "topRecommendedSongs": [],
    "topPlayedRecommendations": []
  }
}
```

#### POST /api/analytics/impressions
- **Description:** Records a batch of recommendation impressions shown to the user.
- **Authentication:** Required (`requireAuth`).
- **Request Body:**
```json
{
  "recommendationRequestId": "req-uuid",
  "strategy": "collaborativeHybrid",
  "mood": "energetic",
  "impressions": [
    {
      "songId": "song-id-1",
      "recommendationScore": 0.94,
      "position": 1
    }
  ]
}
```
- **Response `201 Created`:** `{ "success": true, "data": { "recorded": 1 } }`

---

### 12. Offline Recommendation Evaluation & Feedback Endpoints (Stage 9 & 10 Implemented)

#### POST /api/evaluation/mood-feedback
- **Description:** Submits subjective 1–5 rating regarding how accurately a recommendation matched the selected mood.
- **Authentication:** Required (`requireAuth`).
- **Request Body:**
```json
{
  "recommendationRequestId": "req-uuid",
  "rating": 5,
  "mood": "energetic",
  "songId": "optional-song-id"
}
```
- **Response `201 Created`:** `{ "success": true, "data": { "id": "..." } }`

#### POST /api/evaluation/explanation-feedback
- **Description:** Submits subjective 1–5 rating regarding explanation helpfulness and perceived recommendation trust.
- **Authentication:** Required (`requireAuth`).
- **Request Body:**
```json
{
  "recommendationRequestId": "req-uuid",
  "rating": 4,
  "reasonType": "collaborative"
}
```
- **Response `201 Created`:** `{ "success": true, "data": { "id": "..." } }`

#### GET /api/evaluation/feedback-summary
- **Description:** Aggregates user mood and explanation ratings across the community.
- **Authentication:** Required (`requireAuth`).
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "moodRatings": [
      { "mood": "energetic", "count": 15, "averageRating": 4.6 }
    ],
    "explanationRatings": { "count": 22, "averageRating": 4.4 }
  }
}
```

#### GET /api/evaluation/recommendations
- **Description:** Evaluates recommendation strategies using temporal train/test split. Returns Precision@K, Recall@K, HitRate@K, NDCG@K, Intra-List Diversity (ILD), Novelty@K, Catalog Coverage, and Collaborative Coverage. Zero data leakage is strictly enforced (user similarities and taste profiles are computed exclusively on the training interval).
- **Authentication:** Required (`requireAuth`).
- **Query Parameters:**
  - `strategy` (*optional*, string, default: `'all'`): `'popularity'`, `'content'`, `'behaviour'`, `'context'`, `'hybrid'`, `'collaborative'`, `'collaborativeHybrid'`, `'ablation_no_mood'`, `'ablation_no_context'`, `'ablation_no_behaviour'`, `'ablation_no_content'`, `'ablation_no_collaborative'`, `'all'`.
  - `k` (*optional*, integer, `5` or `10`, default: `10`).
  - `trainDays` (*optional*, integer, default: `30`).
  - `testDays` (*optional*, integer, default: `7`).
- **Response `200 OK` (when insufficient historical data exists):**
```json
{
  "success": true,
  "data": {
    "k": 10,
    "trainDays": 30,
    "testDays": 7,
    "usersEvaluated": 0,
    "evaluatedAt": "2026-10-08T18:00:00.000Z",
    "strategies": { ... },
    "insufficientData": true,
    "message": "Not enough listening data yet for offline evaluation across historical users."
  }
}
```

---

## Stage 12 Endpoints: User Library & Playlists

### 11. User Library Endpoints

#### GET /api/library
- **Description:** Returns library overview metrics (counts of liked tracks, playlists, and listening history).
- **Authentication:** Required (`requireAuth`).
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "likedCount": 24,
    "playlistsCount": 3,
    "recentlyPlayedCount": 85
  }
}
```

#### GET /api/library/likes
- **Description:** Returns the authenticated user's liked tracks, ordered newest first.
- **Authentication:** Required (`requireAuth`).
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "songs": [
      {
        "id": "670498b...",
        "title": "Midnight Resonance",
        "artistName": "Astral Wave",
        "durationSeconds": 214,
        "artworkUrl": "https://...",
        "streamUrl": "https://...",
        "provider": "jamendo",
        "providerTrackId": "1884481"
      }
    ],
    "total": 1
  }
}
```

#### GET /api/library/likes/check?songIds=id1,id2
- **Description:** Batch checks whether specific tracks are liked by the authenticated user.
- **Authentication:** Required (`requireAuth`).
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "670498b...": true,
    "670498c...": false
  }
}
```

#### POST /api/library/likes/:songId
- **Description:** Adds a song to the authenticated user's liked tracks using atomic `$addToSet`. Idempotent.
- **Authentication:** Required (`requireAuth`).
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "isLiked": true,
    "songId": "670498b..."
  }
}
```

#### DELETE /api/library/likes/:songId
- **Description:** Removes a song from the authenticated user's liked tracks using atomic `$pull`. Idempotent.
- **Authentication:** Required (`requireAuth`).
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "isLiked": false,
    "songId": "670498b..."
  }
}
```

#### GET /api/library/history
- **Description:** Returns the authenticated user's recently played tracks derived from canonical `ListeningEvent` telemetry.
- **Authentication:** Required (`requireAuth`).
- **Query Parameters:** `limit` (*optional*, integer, 1–50, default: 20).
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "song": {
          "id": "670498b...",
          "title": "Midnight Resonance",
          "artistName": "Astral Wave",
          "durationSeconds": 214,
          "artworkUrl": "https://..."
        },
        "playedAt": "2026-10-08T18:30:00.000Z",
        "eventType": "complete",
        "completionPercent": 100
      }
    ],
    "total": 1
  }
}
```

---

### 12. Playlist Endpoints

#### POST /api/playlists
- **Description:** Creates a new user playlist and records it in `UserLibrary.savedPlaylistIds`.
- **Authentication:** Required (`requireAuth`).
- **Request Body:**
```json
{
  "name": "Midnight Chill",
  "description": "Ambient electronic vibes",
  "isPublic": false
}
```
- **Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": "670512a...",
    "userId": "670481f...",
    "name": "Midnight Chill",
    "description": "Ambient electronic vibes",
    "songCount": 0,
    "isPublic": false,
    "createdAt": "2026-10-08T18:40:00.000Z",
    "updatedAt": "2026-10-08T18:40:00.000Z"
  }
}
```

#### GET /api/playlists
- **Description:** Returns the authenticated user's playlists ordered by recency (`updatedAt: -1`).
- **Authentication:** Required (`requireAuth`).
- **Response `200 OK`:** Array of `PlaylistSummaryDto`.

#### GET /api/playlists/:id
- **Description:** Returns full playlist details with populated songs. IDOR enforced: private playlists require ownership.
- **Authentication:** Optional (`optionalAuth`).
- **Response `200 OK`:** `PlaylistDetailDto`.

#### PUT /api/playlists/:id
- **Description:** Updates playlist name, description, or visibility. IDOR protected: only owner can edit.
- **Authentication:** Required (`requireAuth`).
- **Request Body:**
```json
{
  "name": "Updated Playlist Name",
  "description": "Updated description"
}
```
- **Response `200 OK`:** `PlaylistSummaryDto`.

#### DELETE /api/playlists/:id
- **Description:** Deletes a playlist. IDOR protected: only owner can delete.
- **Authentication:** Required (`requireAuth`).
- **Response `200 OK`:** `{ "success": true, "data": { "success": true, "deletedId": "..." } }`.

#### POST /api/playlists/:id/songs/:songId
- **Description:** Adds a song to the playlist using atomic `$addToSet`. Bounded to max 500 songs. IDOR protected.
- **Authentication:** Required (`requireAuth`).
- **Response `200 OK`:** Updated `PlaylistDetailDto`.

#### DELETE /api/playlists/:id/songs/:songId
- **Description:** Removes a song from the playlist using atomic `$pull`. IDOR protected.
- **Authentication:** Required (`requireAuth`).
- **Response `200 OK`:** Updated `PlaylistDetailDto`.




