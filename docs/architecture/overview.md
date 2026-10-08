# TuneSense Architecture Overview

## Academic Context
**Project Title:** TuneSense: A Personalized, Context-Aware and Explainable Music Recommendation System Using NoSQL  
**Tagline:** Music that understands your vibe.

---

## Architectural Principles

1. **Separation of Concerns:**
   - **Frontend (Mobile-First React + Vite):** Pure presentation, typed services (`musicService.ts`, `apiClient.ts`), and native HTML5 audio playback state (`AudioPlayerContext.tsx`).
   - **API Layer (Express + TypeScript):** Request routing, validation (Zod), middleware orchestration, and centralized error handling.
   - **Data Layer (MongoDB Atlas via Mongoose — Stage 2 Implemented):** Core domain document schemas for `User`, `Song`, `Artist`, `Album`, `UserPreference`, and `ListeningEvent`. Centralized connection pooling and justified index strategy.
   - **Provider Layer (`IMusicProvider` — Stage 3 Active):** Abstracted vendor-neutral interface with `JamendoProvider` implementation fetching Creative Commons music metadata and playable MP3 stream URLs.
   - **Recommendation Layer (Future Component):** Independent recommendation algorithms (hybrid collaborative, context-aware, mood-aware, explainability generation) operating strictly on canonical domain entities. (Not implemented yet).

2. **Mobile-First Paradigm:**
   - Primary design targets: 360px, 375px, 390px, 412px viewports.
   - Mobile-first `MiniPlayer` with scrub seek, play/pause, volume control, and safe-area docking above bottom navigation.
   - Responsive scaling to tablets and desktop without breaking layout or horizontal scroll.

3. **Current System Architecture (Stage 3):**
   ```
                       MOBILE-FIRST REACT APP (Port 5173)
                                 │
                                 │ REST / HTTP (apiClient, musicService)
                                 ▼
                          EXPRESS API (Port 5000)
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
             MongoDB Atlas          Music Service Layer
           (Stage 2 Active)                   │
             ├── users                        ▼
             ├── songs ◄──────────  IMusicProvider Interface
             ├── artists (Deduplicated        │
             ├── albums   Upsert)             ▼
             ├── userPreferences       JamendoProvider
             └── listeningEvents              │
                    │                         ▼
                    ▼                  Jamendo REST API
          Recommendation Engine     (api.jamendo.com/v3.0)
            (Future Component)                │
                                              ▼
                                     Playable Audio Streams
                                     (HTML5 Native Player)
   ```
   - **Data Access Invariant:** The frontend NEVER directly connects to MongoDB or Jamendo API credentials. All data access is strictly governed by the Express API.
   - **Provider Decoupling:** The recommendation engine will operate strictly on canonical domain models (`Song`, `UserPreference`, `ListeningEvent`) rather than vendor-specific structures.
   - **No Audio in MongoDB:** MongoDB stores only metadata and provider tracking IDs. Audio streams are hosted externally by the provider CDN.

---

---

## Authentication Architecture (Stage 4 Implemented)

### Authentication Flow
```
React (AuthContext / authService)
       │
       │ HTTP / JSON (credentials: 'include')
       ▼
Express API (/api/auth/*)
       │
       ├──► POST /signup / POST /login ──► AuthService
       │                                       │
       │                                       ├──► bcryptjs (Work Factor 12)
       │                                       ├──► User Model & UserPreference Model
       │                                       └──► Issue Signed JWT in HTTP-Only Cookie
       │
       └──► Protected Routes (GET /me) ──► Auth Middleware (requireAuth)
                                               │
                                               ├──► Verify tunesense_token Cookie
                                               ├──► Extract sub (User ID)
                                               ├──► Attach req.user = { id }
                                               └──► Fetch User Document (Safe Representation)
```

- **Credential Isolation:** Raw passwords and password hashes are never transmitted to the frontend.
- **Cookie Security:** The JWT is transported exclusively via an HTTP-only, SameSite=Lax cookie (`tunesense_token`), protecting against XSS token harvesting.
- **Preference Binding:** Every user account is automatically bound 1:1 to an initial `UserPreference` record during signup.

---

---

## Listening Behaviour Tracking Architecture (Stage 5 Implemented)

### Telemetry & Ingestion Flow
```
User Music Interaction (Play / Pause / Skip / Complete)
       │
       ▼
AudioPlayerContext (HTML5 Audio Lifecycle Events)
       │
       ▼
listeningEventService (Deduplication, Temporal Context, Session ID)
       │
       │ HTTP POST /api/listening-events (credentials: 'include')
       ▼
Express API (/api/listening-events)
       │
       ├──► requireAuth Middleware (Extracts sub from tunesense_token)
       │        │
       │        ▼
       ├──► listeningEventController (Validates Zod payload)
       │        │
       │        ▼
       ├──► ListeningEventService
       │        │
       │        ├──► Verifies Song Exists in MongoDB (404 if missing)
       │        ├──► Normalizes Playback Metrics (Position, Duration, Completion %)
       │        ├──► Enforces Play Deduplication Window
       │        └──► Persists ListeningEvent Document (Bound to User & Song)
       │
       ▼
MongoDB Atlas (listeningEvents Collection)
```

- **User Isolation:** `userId` is strictly derived from verified JWT session cookies, preventing spoofing.
- **Non-blocking Telemetry:** Background request dispatches protect playback continuity even during network failure.
- **Data Integrity:** Only verified catalog songs can receive listening event logs; orphaned documents are forbidden.

---

## Dynamic User Taste Profile Intelligence Architecture (Stage 6 Implemented)

### Profile Computation & Materialization Pipeline
```
ListeningEvent (Raw Telemetry)
       │
       ▼
MongoDB Aggregation Pipeline ($match, $lookup songs, $unwind, $sort)
       │
       ▼
UserTasteProfileService
       ├── Event & Completion Weighting (+1.00 complete, +0.10..0.50 play, -0.75 skip, +0.05 pause)
       ├── Exponential Recency Decay (e^(-λ * ageInDays), λ = 0.05)
       ├── Dual-Layer Partitioning:
       │     ├── Long-Term Taste (Comprehensive history)
       │     └── Recent Taste (Last 30-day window)
       ├── Trend Extraction (Recent - Long-Term score delta)
       ├── Acoustic Profile Synthesis (Acousticness, Danceability, Energy, Valence, etc.)
       ├── Behavioural & Cyclical Distribution (Skip rate, completion rate, time-of-day, day-of-week)
       └── Evidence-Based Profile Confidence Metric (0.0 to 1.0)
       │
       ▼
UserTasteProfile (MongoDB Materialized View)
       │
       ▼
Future Recommendation Engine (Stages 7+)
```

- **Materialized View Pattern:** Profiles act as precomputed summaries stored in `userTasteProfiles`, avoiding expensive aggregation scans on real-time recommendation queries.
- **Strict User Isolation:** Endpoints (`GET /api/profile/taste`, `POST /api/profile/taste/rebuild`) derive user identity strictly from verified JWT credentials (`req.user.id`). Arbitrary `userId` querying or spoofing is blocked.
- **Explainability & Reproducibility:** Profile calculation uses deterministic mathematical weighting with no random or opaque ML black-box scoring.

---

## Recommendation Engine Architecture (Stage 7 Implemented)

### Recommendation Pipeline Flow
```
UserTasteProfile (Materialized View)
        │
        ▼
Candidate Generation (Top genres, artists, recent trends, popular tracks)
        │
        ├── Filtering (Malformed songs, recent completion cooloff: 2h)
        ├── Deduplication (Track IDs / provider IDs)
        └── Feature Enrichment (Acoustics, duration, artists)
        │
        ▼
Multi-Strategy Scoring (Normalized [0, 1])
        ├── R0: Popularity Strategy (Catalogue engagement baseline)
        ├── R1: Content Strategy (Genre, artist, audio feature similarity)
        ├── R2: Behaviour Strategy (Long-term vs. recent taste blend, rising trends)
        └── R3: Context Strategy (Time-of-day, day-of-week, energy alignment)
        │
        ▼
R4: Hybrid Ranking & Dynamic Confidence Weighting
        ├── Linear composite combination
        └── Dynamic adaptation: scales down personalization on low confidence
        │
        ▼
Diversity + Novelty Enforcement
        ├── Artist limit: max 2 tracks per artist
        ├── Album limit: max 2 tracks per album
        ├── Novelty exploration: 15% slots reserved for fresh discoveries
        └── Deterministic sorting & tie-breaking
        │
        ▼
Explanation Generator
        ├── Structured signal identification (dominant contributor)
        └── Human-readable reason mapping ("Because you often listen to...")
        │
        ▼
Recommendation DTO Response (GET /api/recommendations)
```

- **Explainable by Design:** Every recommendation item exposes the underlying mathematical signals and human-readable reason.
- **Provider-Independent:** Recommender evaluates canonical `CandidateSongEnriched` models independently of external providers.
- **Zero Collaborative Filtering:** Kept strictly content, behavioural, and contextual; collaborative filtering is deferred to later benchmarking stages.

---

## Personalization, Mood-Aware Input, and User Controls Architecture (Stage 8 Implemented)

### End-to-End Personalization Flow
```
User Explicit Preferences (UserPreference)
       +
Inferred Behavioural Taste (UserTasteProfile)
       +
Current Selected Mood (?mood=... / session)
       +
Temporal Context (time-of-day, day-of-week)
       │
       ▼
Candidate Generation
       ├── Seeded with User Preferred Genres & Artists
       └── Filtered against Disliked Genres & Disliked Artists
       │
       ▼
Mood-Aware Hybrid Scoring (R4 Extension)
       ├── Candidate Acoustic Profile vs. Target Mood (valence, energy, tempo, etc.)
       ├── Explicit Preference Bonus (+0.15..+0.25 for preferred genres)
       ├── Dislike Suppression (disliked tracks penalized to 0.01)
       └── Dynamic Weights with Mood (w_content: 0.30, w_behaviour: 0.25, w_context: 0.15, w_mood: 0.15, w_pop: 0.15)
       │
       ▼
User-Controlled Post-Processing
       ├── Exploration Level (0.0 to 1.0): dynamically allocates novelty slots
       └── Diversity Level (0.0 to 1.0): dynamically modulates artist & album caps
       │
       ▼
Explainability Engine
       ├── Detects when mood is active and dominant
       └── Generates transparent reasons ("Fits your energetic mood and your usual electronic taste")
       │
       ▼
Client Presentation
       ├── Home: Mobile Mood Selector (8 controlled moods, 44px touch targets, clear button)
       ├── Profile: Full Preferences Editor (genres, languages, artists, dislikes, sliders, save)
       └── Onboarding: 5-Step Mobile Setup Wizard (/onboarding)
```

- **Separation of Concerns:** `UserPreference` stores explicit declarations; `UserTasteProfile` stores inferred behavioural history. `UserPreference` maintains a strict 1:1 relationship with `User` via unique index.
- **Controlled Mood Taxonomy:** Exactly 8 moods (`happy`, `energetic`, `relaxed`, `focused`, `romantic`, `sad`, `calm`, `nostalgic`) with deterministic acoustic profile heuristics in `moodConfig.ts`.
- **Transient Mood Scope:** Current mood is a session-level parameter that modulates real-time scoring without polluting long-term listening history.

---

## Analytics, Recommendation Evaluation & Experimentation Architecture (Stage 9 Implemented)

### Measurement Architecture
```
[User Audio Playback] ────────► ListeningEvent (Append-only Telemetry)
                                    ▲
                                    │ Attributed by recommendationRequestId
                                    │
[Recommendation Card] ────────► RecommendationImpression (Exposure tracking)
                                    │
                                    ▼
                         [MongoDB Aggregation Pipeline]
                         ($match, $group, $facet, $lookup, $unwind)
                                    │
                                    ├── User Listening Analytics (/api/analytics/me)
                                    │   (Plays, Completion Rate, Skip Rate, Time of Day, Top Genres)
                                    └── Recommendation Analytics (/api/analytics/recommendations)
                                        (Impressions, Conversion CTR, Position Decay, Mood Performance)
```

### Offline Recommendation Evaluation Framework
```
Historical Listening Events
             │
             ▼
   Temporal Split (T_split = T_now - testDays)
             ├── Training Events (T < T_split) ────────► Candidate Scoring & Recommendation
             └── Test Events (T >= T_split)    ────────► Ground Truth (Zero future leakage)
                                                               │
                                                               ▼
                                               Academic Evaluation Metrics:
                                               ├── Precision@K (K=5, 10)
                                               ├── Recall@K (K=5, 10)
                                               ├── HitRate@K (K=5, 10)
                                               ├── NDCG@K (Logarithmic rank discount)
                                               ├── Intra-List Diversity (ILD pairwise dissimilarity)
                                               ├── Novelty@K (Inverse exposure decay)
                                               └── Catalog Coverage (Unique items / Catalogue)
```

- **Academic Integrity:** Zero fabrication rule enforced. If users have fewer than 3 training events or no held-out events, evaluation returns `insufficientData: true` with a descriptive message rather than synthetic scores.
- **Subjective Perception Evaluation:** `EvaluationFeedback` collection captures 1–5 Likert scale user ratings for mood accuracy and explanation trust/helpfulness.

---

## Classical Collaborative Personalization Architecture (Stage 10 Implemented)

### End-to-End Collaborative Filtering & Hybrid Flow
```
User Listening Events (ListeningEvent Collection)
         │
         ▼
Sparse Interaction Aggregation (weighted: complete +1.0, play +0.10, pause +0.05, skip -0.75)
         │
         ▼
UserSongInteraction (Materialized Sparse Collection: {userId, songId, interactionScore, ...})
         │
         ▼
Similar-User Discovery (MongoDB Aggregation $lookup / $group on common songs)
         │
         ▼
Vector Cosine Similarity:
               Σ (r_u,s * r_v,s)
sim(u, v) = ───────────────────────
             sqrt(Σ r_u^2) * sqrt(Σ r_v^2)
         │
         ├── Filter: commonSongs >= 2, similarity >= 0.10, top 20 peers
         └── Cache: UserSimilarity Materialized View ({userId, similarUserId, similarity, ...})
         │
         ▼
Collaborative Candidate Generation
         ├── Pulls candidate songs strongly engaged with by top similar peers
         ├── Prunes songs target user already consumed
         ├── Suppresses user's disliked genres and artists
         ├── Applies popularity dampening: score / (1 + popCount)^0.35
         └── Computes collaborative confidence metric [0, 1]
         │
         ▼
R5: Collaborative Hybrid Strategy
         ├── Dynamic Weight Redistribution (weights sum to 1.00, non-negative)
         │     w_collab_eff = w_collab_base * confidence
         │     residual redistributed proportionally to content, behaviour, context, mood, popularity
         ├── Candidate Diversity Caps (artist/album limits)
         └── Aggregate Privacy-Safe Explanations ("Listeners with tastes similar to yours enjoyed this")
         │
         ▼
Recommendation DTO Response / Offline Evaluation (R0–R5 + Ablations)
```

- **Classical & Explainable Design:** Avoids opaque black-box neural networks, embeddings, and vector databases in favor of transparent, defensible user-based cosine similarity.
- **Sparse Representation:** Stores only non-zero `(userId, songId)` pairs in `UserSongInteraction`, preventing quadratic storage blowup.
- **No Data Leakage:** Offline temporal evaluation calculates similarities strictly from interactions prior to the split timestamp ($T < T_{split}$).
- **Privacy Guaranteed:** Zero PII leakage — peer identities, emails, and individual user IDs are strictly excluded from recommendation responses and explanations.

---

## Development Roadmap & Milestones

- **Stage 1 (Completed):** Project foundation, monorepo structure, mobile-first design system shell, Express health endpoint, documentation, and TypeScript validation.
- **Stage 2 (Completed):** MongoDB architecture, Mongoose connection management, environment validation, core domain schemas (`User`, `Song`, `Artist`, `Album`, `UserPreference`, `ListeningEvent`), justified indexing strategy, and degraded startup handling.
- **Stage 3 (Completed):** Music provider abstraction (`IMusicProvider`), `JamendoProvider` integration, server-side credential isolation, catalogue ingestion/deduplication, catalogue search, and native HTML5 audio streaming.
- **Stage 4 (Completed):** User authentication, secure password hashing (bcryptjs), JWT sessions with HTTP-only cookies, authentication middleware, user identity context, and default `UserPreference` provisioning.
- **Stage 5 (Completed):** Authenticated listening behaviour tracking, playback telemetry (`play`, `pause`, `skip`, `complete`), context capture, deduplication, and structured `ListeningEvent` persistence.
- **Stage 6 (Completed):** Dynamic User Taste Profile and Preference Intelligence (Dual-layer long-term vs. recent taste, event/completion weighting, exponential recency decay, acoustic preference mapping, behavioral & temporal context metrics, cold-start confidence, materialized `UserTasteProfile`).
- **Stage 7 (Completed):** Recommendation Engine — Baselines (R0), Content Personalization (R1), Behavioural Personalization (R2), Context Awareness (R3), and Full Hybrid Ranking (R4), with diversity, novelty, cold start, and explainability.
- **Stage 8 (Completed):** Personalization, Mood-Aware Input, and User Controls (Explicit preferences, 8 controlled moods, mood acoustic scoring, dislike penalties, exploration/diversity sliders, mobile onboarding wizard, and explainable mood rationale).
- **Stage 9 (Completed):** Analytics, Recommendation Evaluation, and Experimentation (Telemetry aggregation pipelines, recommendation impression tracking, play attribution, offline temporal evaluation framework, Precision@K, Recall@K, HitRate@K, NDCG@K, Intra-List Diversity, Novelty@K, Catalog Coverage, baseline comparison R0–R4, ablations, subjective mood/explanation feedback, and mobile-first analytics UI).
- **Stage 10 (Completed):** Advanced NoSQL and Collaborative Personalization (User-based collaborative filtering, sparse `UserSongInteraction` and `UserSimilarity` materialized collections, cosine similarity over sparse vectors, popularity bias dampening, cold-start confidence scaling, R5 collaborative hybrid strategy, collaborative coverage metric, strict temporal non-leakage verification, and privacy-preserving explanations).
- **Future Stages (Post-Stage 10):** Native mobile packaging, external cloud deployment, and viva demonstration.



