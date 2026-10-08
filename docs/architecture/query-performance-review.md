# TuneSense NoSQL Query & Performance Review (Stage 11)

**Date:** 2026-10-08  
**Scope:** MongoDB Collections, Mongoose Schemas, Aggregation Pipelines, and Recommendation Engine Query Paths.

---

## 1. Overview

TuneSense utilizes a document-oriented MongoDB architecture with precomputed materialized views (`UserTasteProfile`, `UserSongInteraction`, `UserSimilarity`) to deliver low-latency personalized recommendations while preserving an append-only operational log (`ListeningEvent`).

---

## 2. Collection Indexing & Query Analysis

### 2.1 Collection: `ListeningEvent`
- **Purpose:** Append-only operational telemetry of music interactions (plays, skips, completions, pauses).
- **Target Queries:**
  1. Profile rebuilding: Fetch user's historical events within recency window (`userId`, `timestamp`).
  2. Impression attribution: Join listening events to recommendation requests (`userId`, `context.recommendationRequestId`).
  3. User analytics: Time-of-day and genre distributions over time.
- **Indexes:**
  - `{ userId: 1, timestamp: -1 }`: Optimizes user history timeline scans and time-windowed taste profile queries.
  - `{ songId: 1, eventType: 1 }`: Enables catalogue-level song play and skip aggregation.
  - `{ 'context.recommendationRequestId': 1 }`: Enables fast recommendation conversion attribution.
- **Why It Helps:** B-Tree traversal avoids full collection scans over high-volume event logs.
- **Scalability Consideration:** High write throughput can be scaled horizontally via hash sharding on `userId` in enterprise MongoDB clusters.

---

### 2.2 Collection: `UserSongInteraction`
- **Purpose:** Materialized sparse matrix of user-song engagement strength.
- **Target Queries:**
  1. User sparse vector lookup: Get all tracks and interaction scores for a given user.
  2. Collaborative peer discovery: Find all other users who engaged positively with the same set of tracks.
  3. Upsert on listening event: Point update of interaction score.
- **Indexes:**
  - `{ userId: 1, songId: 1 }` (Unique): Guarantees sparse uniqueness and $O(1)$ point lookups/upserts.
  - `{ songId: 1, interactionScore: -1 }`: Accelerates inverted index lookups for peer discovery.
  - `{ userId: 1, interactionScore: -1 }`: Enables fast extraction of a target user's top-rated tracks.
  - `{ lastInteractionAt: -1 }`: Facilitates efficient cache invalidation and temporal pruning.
- **Why It Helps:** Enables $O(k)$ sparse intersection calculations rather than $O(N)$ dense matrix operations.
- **Scalability Consideration:** If a single user interacts with tens of thousands of songs, queries remain bounded by pagination/limiting top $M$ tracks.

---

### 2.3 Collection: `UserSimilarity`
- **Purpose:** Materialized top-$K$ peer similarity cache.
- **Target Queries:**
  1. Top similar peers lookup: Retrieve candidate peer user IDs sorted by similarity.
  2. Staleness check: Verify `calculatedAt` timestamp against 24-hour TTL.
- **Indexes:**
  - `{ userId: 1, similarUserId: 1 }` (Unique): Idempotent similarity upserting.
  - `{ userId: 1, similarity: -1 }`: Instant index-covered sort for top $K \le 20$ peers.
  - `{ calculatedAt: -1 }`: Fast batch discovery of expired similarity entries.
- **Why It Helps:** Converts complex $O(U \cdot S)$ pairwise aggregation into an instant $O(K)$ indexed index read.
- **Scalability Consideration:** Cache entries are capped at `maxSimilarUsers: 20` per user, keeping total collection size proportional to $20 \times |U|$.

---

### 2.4 Collection: `UserTasteProfile`
- **Purpose:** Materialized snapshot of user acoustic preferences, top genres, artists, and cyclical listening patterns.
- **Target Queries:**
  1. Real-time recommendation scoring: Fetch precomputed profile during `GET /api/recommendations`.
- **Indexes:**
  - `{ userId: 1 }` (Unique): $O(1)$ single-document retrieval.
  - `{ profileConfidence: -1 }`: Diagnostic querying of cold vs warm profiles.
- **Why It Helps:** Eliminates runtime aggregation on raw `ListeningEvent` collection during user browsing.
- **Scalability Consideration:** Flat document size (< 5 KB per user) ensures high MongoDB WiredTiger cache residency.

---

### 2.5 Collection: `Song`
- **Purpose:** Music catalogue metadata, acoustic attributes, and popularity counters.
- **Target Queries:**
  1. Candidate generation: Filter by genres, moods, preferred artists, popularity.
  2. Deduplication: Match provider track IDs.
- **Indexes:**
  - `{ provider: 1, providerTrackId: 1 }` (Unique): Ingestion deduplication.
  - `{ genres: 1, 'metrics.playCount': -1 }`: Fast candidate generation by genre sorted by popularity.
  - `{ artistId: 1 }`: Fast lookup of tracks by artist.
  - `{ 'audioFeatures.energy': 1, 'audioFeatures.valence': 1 }`: Compound filtering for mood match queries.
- **Why It Helps:** Multi-key B-Tree indexing allows efficient querying across genre arrays without full collection scans.

---

### 2.6 Collection: `RecommendationImpression`
- **Purpose:** Recommendation exposure tracking and impression logs.
- **Target Queries:**
  1. Attribution lookup: Find impressions matching a `recommendationRequestId`.
  2. Strategy performance analytics: Aggregating conversion rates per strategy and mood.
- **Indexes:**
  - `{ recommendationRequestId: 1 }` (Unique): $O(1)$ lookup for conversion attribution.
  - `{ userId: 1, createdAt: -1 }`: Fast user-level impression history scans.
  - `{ strategy: 1, createdAt: -1 }`: Strategy benchmark aggregation.

---

## 3. Query Execution Patterns & Safeguards

1. **Bounded Limits:** Recommendation endpoints strictly bound limit parameters ($1 \le \text{limit} \le 20$), preventing uncontrolled payload sizes or excessive database transfers.
2. **Selective Projection (`.select()`):** Heavy unused fields are excluded during candidate generation.
3. **Lean Queries (`.lean()`):** Read-only recommendation passes use plain JavaScript objects to reduce Mongoose document instantiation overhead.
4. **Aggregation Pipelining:** Complex multi-step analytical summaries (`$facet`, `$group`, `$match`) execute directly within MongoDB's C++ aggregation engine rather than pulling raw datasets into Node.js heap memory.
