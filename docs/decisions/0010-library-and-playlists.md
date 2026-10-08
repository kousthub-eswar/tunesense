# ADR 0010: User Library, Playlist Architecture, and Audio Queue Management

## Status
**Accepted** (Stage 12)

## Context
Following the completion of core recommendation, analytics, and collaborative filtering pipelines (Stages 1–11), TuneSense requires a dedicated, persistent product experience layer enabling listeners to:
1. Save and organize music into custom playlists.
2. Maintain a persistent list of liked / favorited songs.
3. Access their real-time listening history derived from actual playback telemetry.
4. Experience seamless, queue-based music playback with shuffle, repeat, and next/previous controls.

In a NoSQL database design, decisions regarding whether to embed complete song metadata or store normalized Object references have major implications for data freshness, storage efficiency, and mutation atomicity.

---

## Decisions

### 1. Document Referencing over Full Document Embedding
- **Decision:** `UserLibrary` and `Playlist` documents store arrays of `Types.ObjectId` referencing `Song` documents rather than duplicating full track objects.
- **Rationale:**
  - **Single Source of Truth:** Song stream URLs, titles, artwork, and acoustic vectors update centrally in the `Song` collection without requiring fan-out updates across thousands of user playlists.
  - **Storage Bounds:** An array of 500 ObjectIds occupies less than 6 KB, keeping documents lightweight and well under MongoDB's 16 MB limit.
  - **Atomic Updates:** Adding and removing tracks is achieved via atomic `$addToSet` and `$pull` operations, preventing race conditions.

---

### 2. UserLibrary Collection Design
- **Document Structure:**
  ```typescript
  interface IUserLibrary {
    _id: Types.ObjectId;
    userId: Types.ObjectId;             // Ref 'User' (Unique, Indexed)
    likedSongIds: Types.ObjectId[];     // Refs 'Song' ($addToSet / $pull)
    savedPlaylistIds: Types.ObjectId[]; // Refs 'Playlist' ($addToSet / $pull)
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- **Indexing Strategy:**
  - `{ userId: 1 }` with `unique: true` guarantees a strict 1:1 relationship between an authenticated user and their library container.

---

### 3. Playlist Collection Design & Hard Constraints
- **Document Structure:**
  ```typescript
  interface IPlaylist {
    _id: Types.ObjectId;
    userId: Types.ObjectId;             // Ref 'User' (Indexed)
    name: string;                       // Max 100 chars, trimmed
    description?: string;               // Max 500 chars, trimmed
    songIds: Types.ObjectId[];          // Max 500 songs (Bounded Schema Validation)
    coverSongId?: Types.ObjectId;       // Optional explicit cover track ref
    isPublic: boolean;                  // Default false
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- **Compound Index:**
  - `{ userId: 1, updatedAt: -1 }` accelerates queries retrieving a user's playlists ordered by most recently modified.
- **Bounded Array Size:**
  - Mongoose custom schema validator restricts `songIds.length <= 500` to guarantee deterministic read performance and prevent runaway array growth.

---

### 4. Security & IDOR Enforcement
- All library and playlist mutation endpoints (`POST /api/playlists`, `PUT /api/playlists/:id`, `DELETE /api/playlists/:id`, `POST /api/playlists/:id/songs/:songId`, `POST /api/library/likes/:songId`) strictly derive the requesting user's identity from the verified JWT cookie (`req.user.id`).
- Attempting to view, modify, or delete another user's private playlist results in an immediate HTTP `403 Forbidden` rejection.

---

### 5. Telemetry-Backed Listening History
- Rather than duplicating history into a separate table, `/api/library/history` queries the canonical `ListeningEvent` collection where `eventType` is `play` or `complete`.
- Results are deduplicated within sliding temporal windows to collapse accidental rapid repeats while surfacing genuine playback chronology.

---

### 6. Client Audio Queue Architecture
- The `AudioPlayerContext` maintains an in-memory queue (`TrackItem[]`), a current playback pointer (`queueIndex`), and playback flags (`isShuffle`, `repeatMode: 'off' | 'one' | 'all'`).
- Shuffle mode preserves the currently playing song at index 0 while randomizing remaining items.
- Previous track logic resets playback to 0:00 if elapsed time exceeds 3 seconds, or navigates to the prior queue item if within the first 3 seconds.

---

## Consequences
- **Positive:** Sub-10ms response times for library queries, zero orphaned metadata updates, robust IDOR protection, and responsive queue transitions across mobile and desktop interfaces.
- **Trade-off:** Populating playlists requires a secondary `$in` batch query on the `Song` and `Artist` collections, which is well-indexed and bounded by the 500-song cap.
