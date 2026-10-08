# ADR 0002: Music Provider Abstraction & Jamendo Integration

## Status
Accepted

## Context
TuneSense requires access to legal, licensed music metadata and playable audio streams to power discovery and recommendations. Commercial platforms (Spotify, Apple Music) impose strict DRM and terms of service that restrict raw audio stream access. Jamendo offers an open platform with millions of Creative Commons-licensed tracks and an official REST API (v3.0) providing legal playback stream URLs.

---

## Decisions

### 1. Vendor-Neutral Interface (`IMusicProvider`)
- **Decision:** All music retrieval operations are defined through `IMusicProvider` (`searchTracks`, `getTrack`, `getArtist`, `getAlbum`, `getStreamUrl`, `getPopularTracks`).
- **Rationale:** The application core must never directly couple to Jamendo API conventions, field naming, or authentication quirks. If TuneSense transitions to or adds another provider (e.g. Free Music Archive, self-hosted catalog, or Spotify metadata), only a new provider class implementing `IMusicProvider` is required.

### 2. Complete Isolation of Jamendo Behind Server-Side Boundary
- **Decision:** The Jamendo API client ID (`JAMENDO_CLIENT_ID`) is maintained strictly on the Express backend server and never exposed to the client bundle or network requests.
- **Rationale:** Prevents credential exposure, centralizes request rate limiting, protects API quotas, and maintains architectural security.

### 3. Transformation to Canonical TuneSense Domain Models
- **Decision:** Raw Jamendo responses (`RawJamendoTrack`, `musicinfo`, etc.) are transformed immediately at the provider boundary into `ProviderTrack`, `ProviderArtist`, and `ProviderAlbum`.
- **Rationale:** The rest of the system (services, controllers, React UI, and future recommendation engines) deals only with standardized, predictable domain types.

### 4. Metadata Persistence in MongoDB & Audio Hosting by Provider
- **Decision:** MongoDB stores catalogue metadata (`Song`, `Artist`, `Album`), provider identifiers (`provider: 'jamendo'`, `providerTrackId`), and acoustic attributes. Audio files and binary streams are **never stored in MongoDB**.
- **Rationale:**
  - Storing audio binary data in MongoDB would violate NoSQL document store ergonomics, causing severe database bloat and excessive bandwidth overhead.
  - Content delivery and high-bandwidth audio streaming are properly handled by the provider's distributed CDN infrastructure via signed/direct stream URLs.
  - Storing metadata locally in MongoDB allows fast querying, deduplication, and prepares track representations for future recommendation vector calculations.

### 5. Multi-Provider Extensibility
- **Decision:** The architecture supports plugging in future providers via a factory pattern (`getMusicProvider()`).
- **Rationale:** A future `SpotifyProvider` or `LocalArchiveProvider` can implement `IMusicProvider` and register seamlessly without changing a single React component or database model.

### 6. Legal & Licensing Compliance
- **Compliance Note:** TuneSense uses the official Jamendo API v3.0 in accordance with Jamendo Developer Terms of Service. Track playback uses Creative Commons licensing (`license_ccurl`) metadata embedded in each track record. TuneSense does not claim copyright or commercial distribution rights over catalog items.

---

## Consequences
- Requires continuous mapping of provider payloads to TuneSense domain DTOs.
- Catalogue data must be deduplicated by `provider + providerTrackId` upon ingestion to prevent redundant MongoDB records.
