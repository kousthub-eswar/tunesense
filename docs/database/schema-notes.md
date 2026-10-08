# TuneSense Database Schema & NoSQL Design Notes

## Database Technology Selection
- **Database Engine:** MongoDB Atlas (Document-oriented NoSQL)
- **Object-Document Mapper (ODM):** Mongoose (^8.x)
- **Database Name:** `tunesense` (configurable via `MONGODB_DB_NAME`)
- **Stage Status:** Stage 3 Active — Music Provider Catalogue Ingestion & Deduplication
- **Stage 3 Schema Modifications:** **None.** The existing Stage 2 schemas for `Song`, `Artist`, and `Album` natively support the provider abstraction without alterations. Audio binaries are never stored in MongoDB.

---

## Collections Specification

### 1. `users` Collection
* **Model Name:** `User`
* **Purpose:** Represents user profile identity. (Authentication credentials, tokens, and roles are deferred to later stages).
* **Important Fields:**
  - `_id`: `ObjectId` — Canonical unique user identifier.
  - `displayName`: `String` (Required, 2–60 chars, trimmed) — User's visible profile name.
  - `email`: `String` (Required, trimmed, lowercase, valid email format) — Primary account contact.
  - `avatarUrl`: `String` (Optional, trimmed) — URL to profile picture.
  - `createdAt`, `updatedAt`: `Date` — Auto-managed Mongoose timestamps.
* **Embedded Fields:** None in this stage.
* **References:** None directly stored on the User document to keep user profile fetches lightweight.
* **Validation Rules:**
  - `displayName` must be between 2 and 60 characters.
  - `email` must match standard RFC email regex format.
* **Indexes:**
  - `{ email: 1 }` (Unique): Ensures global account uniqueness and enables $O(\log N)$ identity lookup.
* **Expected Access Patterns:**
  - Fast single-document read by email during future authentication and profile loading.
  - Direct read by `_id` on profile view requests.
* **NoSQL Justification:** Users form the core root entity. Keeping identity distinct from interaction streams ensures atomic profile updates without locking large behavioral subdocuments.

---

### 2. `songs` Collection
* **Model Name:** `Song`
* **Purpose:** Canonical representation of a musical track, designed to be completely independent of third-party catalog providers.
* **Important Fields:**
  - `_id`: `ObjectId` — Canonical track identifier.
  - `title`: `String` (Required, 1–200 chars, trimmed) — Track title.
  - `artistIds`: `[ObjectId]` (Required, min 1 item, ref: `Artist`) — Contributing artists.
  - `albumId`: `ObjectId` (Optional, ref: `Album`) — Associated album.
  - `genres`: `[String]` (Trimmed, lowercase) — Genre tags.
  - `languages`: `[String]` (Trimmed, lowercase) — Vocal languages.
  - `durationSeconds`: `Number` (Required, min: 1) — Playback duration in seconds.
  - `artworkUrl`: `String` (Optional) — High-resolution cover artwork.
  - `provider`: `String` (Required, default: `'custom'`) — Music provider label (e.g., `'jamendo'`, `'custom'`).
  - `providerTrackId`: `String` (Optional) — External provider's track identifier.
  - `createdAt`, `updatedAt`: `Date` — Mongoose timestamps.
* **Embedded Fields:**
  - `metadata`: Subdocument capturing acoustic and musical features:
    - `tempo`: `Number` (BPM: 0–300)
    - `energy`: `Number` (0.0–1.0)
    - `danceability`: `Number` (0.0–1.0)
    - `valence`: `Number` (0.0–1.0, musical positivity)
    - `acousticness`: `Number` (0.0–1.0)
    - `instrumentalness`: `Number` (0.0–1.0)
    - `key`: `String`
    - `mode`: `Number` (0 = Minor, 1 = Major)
* **References:**
  - `artistIds` references `Artist` documents.
  - `albumId` references an `Album` document.
* **Validation Rules:**
  - Array validation requires at least one artist in `artistIds`.
  - Normalized audio feature ranges (0.0 to 1.0).
* **Indexes:**
  - `{ title: 1 }`: Supports track search and alphabetical indexing.
  - `{ provider: 1, providerTrackId: 1 }` (Sparse): Prevents duplicate imports from external catalog providers while allowing custom tracks without provider IDs.
  - `{ genres: 1 }`: Multikey index supporting fast genre filtering and recommendation seed querying.
* **Expected Access Patterns:**
  - Query by ID on playback selection.
  - Query by provider and providerTrackId during catalog synchronization.
  - Filter by genre list for mood and genre exploration.
* **NoSQL Justification:** Embedding acoustic metadata directly within the track document prevents expensive joins during vector-distance calculations in future recommendation scoring.

---

### 3. `artists` Collection
* **Model Name:** `Artist`
* **Purpose:** Represents musical artists, bands, or creators.
* **Important Fields:**
  - `_id`: `ObjectId` — Artist identifier.
  - `name`: `String` (Required, 1–150 chars, trimmed) — Artist name.
  - `imageUrl`: `String` (Optional) — Artist profile or banner image.
  - `genres`: `[String]` (Trimmed, lowercase) — Primary musical styles.
  - `languages`: `[String]` (Trimmed, lowercase) — Performance languages.
  - `createdAt`, `updatedAt`: `Date` — Mongoose timestamps.
* **Embedded Fields:**
  - `metadata`: Subdocument containing:
    - `bio`: `String` (max 2000 chars) — Biographical overview.
    - `country`: `String` — Country of origin.
    - `externalUrls`: `Map<String, String>` — Links to official profiles.
* **References:** None directly stored on the artist. Track associations are maintained on `Song.artistIds` and `Album.artistIds`.
* **Validation Rules:** Required non-empty name.
* **Indexes:**
  - `{ name: 1 }`: Fast artist title queries and autocomplete lookup.
* **Expected Access Patterns:**
  - Read by `_id` when rendering track credits or artist profile views.
  - Prefix/exact match by `name`.
* **NoSQL Justification:** Independent artist entities allow multiple tracks to reference the same creator without data duplication.

---

### 4. `albums` Collection
* **Model Name:** `Album`
* **Purpose:** Represents albums, EPs, or singles collections.
* **Important Fields:**
  - `_id`: `ObjectId` — Album identifier.
  - `title`: `String` (Required, 1–200 chars, trimmed) — Album title.
  - `artistIds`: `[ObjectId]` (Required, min 1 item, ref: `Artist`) — Credited artists.
  - `artworkUrl`: `String` (Optional) — Album cover image.
  - `releaseDate`: `Date` (Optional) — Original release date.
  - `genres`: `[String]` — Primary genres.
  - `createdAt`, `updatedAt`: `Date` — Mongoose timestamps.
* **Embedded Fields:** None.
* **References:** `artistIds` references `Artist`.
* **Validation Rules:** Non-empty title and at least one artist reference.
* **Indexes:**
  - `{ title: 1 }`: Fast album search.
* **Expected Access Patterns:**
  - Read by `_id` when inspecting album tracklists or song parent metadata.

---

### 5. `userPreferences` Collection
* **Model Name:** `UserPreference`
* **Purpose:** Stores personalized taste vectors, mood affinities, and cold-start onboarding selections for a user.
* **Important Fields:**
  - `_id`: `ObjectId` — Document identifier.
  - `userId`: `ObjectId` (Required, unique, ref: `User`) — 1:1 owner reference.
  - `favoriteGenres`: `[String]` — Explicitly selected or reinforced genres.
  - `favoriteArtists`: `[ObjectId]` (ref: `Artist`) — Followed or favorite artists.
  - `preferredLanguages`: `[String]` — Preferred vocal languages.
  - `preferredMoods`: `[String]` — Active mood preferences (e.g., `'focus'`, `'chill'`).
  - `createdAt`, `updatedAt`: `Date` — Mongoose timestamps.
* **Embedded Fields:** Preference tag arrays.
* **References:** `userId` (ref: `User`), `favoriteArtists` (ref: `Artist`).
* **Validation Rules:** Unique `userId` ensures exactly one preference document per user.
* **Indexes:**
  - `{ userId: 1 }` (Unique): Guarantees strict 1-to-1 relationship with `User` and instant preference vector resolution.
* **Expected Access Patterns:**
  - Read once per session or recommendation request by `userId`.
  - Atomic array update when user adjusts mood or likes an artist.
* **NoSQL Justification:** Storing user preferences as a separate, self-contained document keeps the core User document small and immutable to frequent taste adjustments, while avoiding relational normalization of tag arrays.

---

### 6. `listeningEvents` Collection
* **Model Name:** `ListeningEvent`
* **Purpose:** High-throughput telemetry log recording every user interaction with a track (play, complete, skip, pause).
* **Important Fields:**
  - `_id`: `ObjectId` — Event identifier.
  - `userId`: `ObjectId` (Required, ref: `User`) — User who triggered the event (strictly bound to authenticated JWT).
  - `songId`: `ObjectId` (Required, ref: `Song`) — Target track (verified to exist in catalogue).
  - `eventType`: `String` (Required, enum: `['play', 'complete', 'skip', 'pause']`) — Action category.
  - `timestamp`: `Date` (Required, default: `Date.now`) — Precise wall-clock occurrence timestamp.
  - `createdAt`, `updatedAt`: `Date` — Document persistence timestamps.
* **Embedded Fields:**
  - `context`: Subdocument capturing ambient context:
    - `timeOfDay`: `'morning'` | `'afternoon'` | `'evening'` | `'late_night'` | `'night'` | `'unknown'`
    - `dayOfWeek`: `'monday'` ... `'sunday'` | `'unknown'`
    - `sessionId`: `String` (Persistent session identifier across tracks)
  - `metadata`: Subdocument capturing playback metrics:
    - `dwellDurationSeconds`: `Number` (Position seconds in playback)
    - `positionSeconds`: `Number` (Explicit track position seconds)
    - `durationSeconds`: `Number` (Total track duration in seconds)
    - `completionPercent`: `Number` (0.0 to 100.0)
    - `completionRate`: `Number` (0.0 to 1.0)
    - `playbackSpeed`: `Number` (Default 1.0)
    - `deviceType`: `String` (Coarse category: `'mobile'`, `'tablet'`, `'desktop'`)
* **References:** `userId` references `User`, `songId` references `Song`.
* **Validation Rules:**
  - `eventType` restricted strictly to enum values.
  - `completionRate` bounded between 0.0 and 1.0; `completionPercent` bounded between 0.0 and 100.0.
  - `timestamp` distinct from `createdAt`.
* **Indexes:**
  - `{ userId: 1, timestamp: -1 }`: **Compound Index** for chronologically retrieving a specific user's listening history and computing recent user taste drift.
  - `{ songId: 1, timestamp: -1 }`: **Compound Index** for calculating track popularity, skip rates, and item-to-item co-occurrence over specified time windows.
* **Expected Access Patterns:**
  - High-frequency write (append-only on playback interaction).
  - Range queries by `userId` bounded by timestamp (e.g., "last 50 events").
  - Aggregation queries by `songId` to compute trending metrics.

---

### 7. `userTasteProfiles` Collection
* **Model Name:** `UserTasteProfile`
* **Purpose:** Materialized view representing the computed, explainable musical taste intelligence for a user, derived from aggregated `ListeningEvent`, `Song`, and `Artist` records.
* **Important Fields:**
  - `_id`: `ObjectId` — Document identifier.
  - `userId`: `ObjectId` (Required, unique, ref: `User`) — 1:1 owner reference.
  - `profileVersion`: `Number` (Required, default: `1`) — Methodology version for backward compatibility.
  - `profileConfidence`: `Number` (Required, 0.0 to 1.0) — Normalized certainty score based on evidence depth.
* **Embedded Subdocuments:**
  - `longTerm`: Long-term taste representation across full listening history:
    - `genres`: `[{ genre: String, score: Number }]` (Normalized 0.0–1.0)
    - `artists`: `[{ artistId: ObjectId, score: Number }]` (Normalized 0.0–1.0, ref: `Artist`)
    - `languages`: `[{ language: String, score: Number }]` (Normalized 0.0–1.0)
    - `audioFeatures`: Key-value map of weighted acoustic preferences (`energy`, `danceability`, `valence`, etc.)
  - `recent`: Short-term taste representation within active window (last 30 days):
    - `genres`, `artists`, `languages`, `audioFeatures` (Same schema as longTerm)
  - `trends`: `[{ genre: String, delta: Number, direction: 'rising' | 'declining' | 'stable' }]` — Shift between recent and long-term affinities.
  - `behaviour`: Aggregate behavioural statistics:
    - `skipRate`: `Number` (0.0–1.0)
    - `completionRate`: `Number` (0.0–1.0)
    - `averageCompletionPercent`: `Number` (0.0–100.0)
    - `totalListeningDurationSeconds`: `Number`
    - `playCount`: `Number`
    - `completeCount`: `Number`
    - `skipCount`: `Number`
    - `pauseCount`: `Number`
  - `context`: Temporal and cyclical engagement distributions:
    - `timeOfDay`: Normalized fractions for `'morning'`, `'afternoon'`, `'evening'`, `'late_night'`
    - `dayOfWeek`: Normalized fractions for `'monday'` through `'sunday'`
  - `metadata`: Evaluation and auditing metrics:
    - `calculatedAt`: `Date` (Wall-clock calculation timestamp)
    - `eventCountUsed`: `Number`
    - `uniqueSongsCount`: `Number`
    - `uniqueArtistsCount`: `Number`
* **References:** `userId` references `User`, `artistId` references `Artist`.
* **Validation Rules:**
  - `userId` must be unique.
  - `profileConfidence` must fall in range [0, 1].
  - Scores across affinities are normalized to [0, 1].
* **Indexes:**
  - `{ userId: 1 }` (Unique): Fast $O(\log N)$ point lookups by authenticated user and guarantees strict 1:1 user-to-profile cardinality.
  - `{ "metadata.calculatedAt": -1 }`: Enables staleness inspection and batch profile recomputation queries.
* **Expected Access Patterns:**
  - Point lookup by `userId` during profile retrieval and future recommendation candidate ranking.
  - Asynchronous background/on-demand replacement via `findOneAndUpdate` upsert upon rebuild.
* **NoSQL Justification:** Acts as a **Materialized View Pattern**. Computing affinity scores over thousands of raw listening events via multi-stage pipelines on every user request would create prohibitive read latency. Storing the consolidated profile as a single denormalized document enables sub-millisecond profile reads while keeping raw event logs untouched.

---

## Embedding vs. Referencing Decisions

| Relationship | Pattern Chosen | Architectural Rationale |
|---|---|---|
| **Song → Acoustic Metadata** | **Embedded** | Acoustic features (tempo, energy, valence) are 1:1, immutable for a given track, and always accessed together when scoring recommendations. Embedding avoids an unnecessary lookup. |
| **Artist → Bio/Country Metadata** | **Embedded** | Artist metadata is relatively small, tightly coupled to the artist identity, and rarely updated independently. |
| **Song → Artist** | **Referenced (`artistIds`)** | Many tracks share artists, and artists are independent primary entities with their own profile views. Embedding full artist documents would duplicate artist data across thousands of tracks. |
| **Song → Album** | **Referenced (`albumId`)** | Albums contain release metadata and cover art shared across all album tracks. Referencing ensures single source of truth. |
| **User → UserPreference** | **Referenced (`userId`)** | Keeps the primary `User` authentication/profile document lean and stable, while allowing `UserPreference` to scale with dynamic affinity vectors and mood parameters without document growth bloat. |
| **ListeningEvent → User / Song** | **Referenced** | An append-only log of millions of listening events cannot be embedded inside the `User` or `Song` document without exceeding MongoDB's 16MB document size limit. Referencing allows the events collection to grow unboundedly. |
| **ListeningEvent → Context / Metadata** | **Embedded** | Context conditions (`timeOfDay`, `dayOfWeek`) and playback telemetry (`dwellDurationSeconds`, `completionRate`) are immutable attributes of that specific event occurrence. |
| **UserTasteProfile → User** | **Referenced (`userId`)** | Keeps user identity lightweight and isolates the computed profile document for independent versioning and cache invalidation. |
| **UserTasteProfile → Layers & Metrics** | **Embedded** | Long-term affinity, recent affinity, acoustic features, and behavioural metrics are always queried together to inform recommendations. Embedding avoids secondary joins. |
| **UserTasteProfile → Artist** | **Referenced (`artistId`)** | Artist affinity embeds the `artistId` reference and affinity score rather than duplicating the entire artist metadata (bio, image, country). |

---

## Future Data Growth Considerations

1. **Listening-Event Growth Rate:**
   - In active production, listening events scale at $O(\text{users} \times \text{daily plays})$. At scale, this collection will outgrow all other collections by multiple orders of magnitude.
   - **Mitigation:**
     - Append-only pattern avoids document moves and memory fragmentation.
     - The compound index `{ userId: 1, timestamp: -1 }` ensures that retrieving a user's recent history requires index-only seeks without table scans.
2. **Materialized View Profile Scalability:**
   - `UserTasteProfile` documents have a bounded, predictable size (~2-5 KB per user) regardless of whether the user has 10 or 100,000 listening events.
   - Storage scales strictly at $O(\text{users})$ rather than $O(\text{events})$.
3. **Index Storage Management:**
   - Indexes are strictly limited to verified query patterns (`email`, `title`, `provider + providerTrackId`, `genres`, `userId + timestamp`, `songId + timestamp`, `userId` on profiles, `calculatedAt`).
   - Sparse index on `{ provider: 1, providerTrackId: 1 }` avoids indexing null provider fields for custom catalog items.
4. **Partitioning & Sharding Strategy (Future):**
   - When the dataset exceeds single-node working memory:
     - The `listeningEvents` collection can be sharded using a hashed shard key on `userId` (or compound `{ userId: 'hashed', timestamp: 1 }`) to evenly distribute write operations across cluster shards while keeping individual user history queries targeted to a single shard.
     - The `userTasteProfiles` collection can be co-located or hashed on `userId` for uniform cluster distribution.

