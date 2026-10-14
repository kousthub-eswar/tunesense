# 🎵 TuneSense: Complete Project Architecture & Codebase Explainer

> **Prompt Note for ChatGPT / LLM:**  
> This document is a complete, self-contained architectural and technical breakdown of **TuneSense**, a personalized, context-aware, and explainable music recommendation system built with **TypeScript, React 18, Node.js/Express, and MongoDB (NoSQL)**. Use this document as your primary context for understanding, explaining, debugging, extending, or answering questions about this project.

---

## 📌 Table of Contents
1. [Executive Summary & Core Mission](#1-executive-summary--core-mission)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [NoSQL Data Modeling & Materialized Views](#4-nosql-data-modeling--materialized-views)
5. [The Recommendation Engine (Strategies R0–R5)](#5-the-recommendation-engine-strategies-r0r5)
6. [Explainable AI (XAI) & Privacy Preservation](#6-explainable-ai-xai--privacy-preservation)
7. [Scientific Offline Evaluation Framework](#7-scientific-offline-evaluation-framework)
8. [Audio Streaming & Persistent Queue Engine](#8-audio-streaming--persistent-queue-engine)
9. [Application Security & Production Hardening](#9-application-security--production-hardening)
10. [Frontend User Experience & Design System](#10-frontend-user-experience--design-system)
11. [Codebase Directory Map](#11-codebase-directory-map)
12. [Pre-Seeded Demo Personas & Verification](#12-pre-seeded-demo-personas--verification)
13. [How to Run the Application Locally](#13-how-to-run-the-application-locally)
14. [Sample Prompts to Ask ChatGPT About This Project](#14-sample-prompts-to-ask-chatgpt-about-this-project)

---

## 1. Executive Summary & Core Mission

### What is TuneSense?
**TuneSense** is a full-stack, production-ready music streaming and recommendation platform. It was developed to solve the critical pitfalls of modern commercial music recommenders (e.g., Spotify, Apple Music), which:
- Act as **opaque "black boxes"** with unexplainable algorithmic decisions.
- Rely on global virality rather than fine-grained personal context (time of day, day of week, active mood).
- Suffer from compute bottlenecks when running real-time aggregations across millions of relational rows.

### Core Value Propositions
1. **Explainable AI (XAI):** Every single recommended song comes with a transparent, human-readable rationale (e.g., *"Matches your taste in Synthwave"*, *"Listeners with tastes similar to yours enjoyed this"*, *"Fits your usual energetic evening listening"*).
2. **Multi-Strategy Hierarchy (R0–R5):** Instead of a single rigid heuristic, TuneSense implements 6 distinct recommendation layers: Popularity Baseline (R0), Content/Acoustic Match (R1), Behavioral Recency Decay (R2), Temporal Context (R3), Hybrid Mood Blending (R4), and User-Based Collaborative Filtering (R5).
3. **NoSQL Document Engineering:** Designed specifically around MongoDB document modeling, append-only telemetry streams, and precomputed materialized views to eliminate expensive multi-table database joins on high-throughput read paths.
4. **Leakage-Free Offline Evaluation:** Contains an integrated academic evaluation suite measuring Precision@K, Recall@K, HitRate@K, NDCG@K, Intra-List Diversity (ILD), and Novelty@K using strict chronological data partitioning ($T_{split}$) with zero metric fabrication.
5. **Real-World Audio Streaming:** Fully integrated with the Jamendo REST API for legal Creative Commons audio streaming, backed by an offline fallback cache.

---

## 2. High-Level System Architecture

```
                               ┌────────────────────────────────────────────────────────┐
                               │             React 18 SPA (Vite + Tailwind)             │
                               │  Desktop Sidebar / Mobile AppShell / Persistent Player │
                               └───────────────────────────┬────────────────────────────┘
                                                           │ HTTP / REST (JWT Cookies)
                                                           ▼
                               ┌────────────────────────────────────────────────────────┐
                               │               Node.js / Express REST API               │
                               │             Strict TypeScript 5.7 + Zod Schemas        │
                               └───────────┬───────────────────────┬────────────────────┘
                                           │                       │
                 ┌─────────────────────────┘                       └────────────────────────┐
                 ▼                                                 ▼                        ▼
     ┌────────────────────────┐                        ┌───────────────────────┐  ┌───────────────────┐
     │   Auth & Security      │                        │ Recommendation Engine │  │ Music Catalogue   │
     │  • Bcrypt (12 rounds)  │                        │  • Candidate Gen      │  │  • Jamendo API    │
     │  • HttpOnly Cookies    │                        │  • R0–R5 Scorers      │  │  • Audio Stream   │
     │  • Rate Limiting       │                        │  • Explainers         │  │  • Offline Cache  │
     └────────────────────────┘                        └───────────┬───────────┘  └───────────────────┘
                                                                   │
                                                                   ▼
                                                ┌───────────────────────────────────────┐
                                                │         MongoDB Atlas (NoSQL)         │
                                                │                                       │
                                                │ Raw Logs (Append-Only):               │
                                                │  • ListeningEvent (Telemetries)       │
                                                │  • RecommendationImpression           │
                                                │                                       │
                                                │ Materialized Views (Precomputed):     │
                                                │  • UserTasteProfile (Decay λ=0.05)    │
                                                │  • UserSongInteraction (Sparse)       │
                                                │  • UserSimilarity (Cosine Sim)        │
                                                │                                       │
                                                │ Domain Collections:                   │
                                                │  • User, UserPreference               │
                                                │  • Song, Artist, Album                │
                                                │  • UserLibrary, Playlist              │
                                                └───────────────────────────────────────┘
```

---

## 3. Technology Stack

### Frontend Client
- **Core:** React 18.3 (Single Page Application), TypeScript 5.7
- **Build Tool:** Vite 6.1 (Fast HMR & asset bundling)
- **Styling:** TailwindCSS 3.4 (Custom Midnight Obsidian & Emerald design system)
- **Routing:** React Router DOM v6
- **Icons:** Lucide React
- **Audio:** Persistent HTML5 Audio Engine embedded in React Context

### Backend REST API
- **Runtime:** Node.js (v20+ recommended), Express 4.21
- **Language:** TypeScript 5.7 executed via `tsx` (TypeScript Execute)
- **Validation:** Zod 3.24 (Strict payload parsing & injection sanitization)
- **Authentication:** JSON Web Tokens (`jsonwebtoken`), `cookie-parser`, `bcryptjs`
- **Security:** CORS, Token-Bucket Rate Limiter, Constant-Time Auth Execution

### Database (NoSQL)
- **Database Engine:** MongoDB Atlas (Cloud) / Local MongoDB
- **ODM:** Mongoose 9.11 with strict schemas and compound indexes

### Music Provider
- **External API:** Jamendo v3.0 REST API (Creative Commons music catalog)
- **Fallback:** Offline acoustic seed data for 100% test reliability

---

## 4. NoSQL Data Modeling & Materialized Views

TuneSense intentionally leverages MongoDB's document model rather than a relational schema to achieve sub-100ms recommendation response times.

### Append-Only Logs vs. Materialized Views
In relational databases, querying user listening history and calculating cosine similarities across millions of rows requires expensive relational JOIN operations that lock tables. TuneSense separates **raw write paths** from **read paths**:

```
ListeningEvent (Append-Only Stream)
  │
  ├──► [Exponential Decay Pipeline] ──► UserTasteProfile (Materialized View) ──► O(1) Read by R1, R2, R4
  │
  └──► [Sparse Aggregation]         ──► UserSongInteraction (Sparse Matrix)
                                          │
                                          └──► [Cosine Sim Pipeline] ──► UserSimilarity ──► O(1) Read by R5
```

### The 13 Mongoose Domain Collections

| Collection | Pattern | Purpose |
| :--- | :--- | :--- |
| `User` | Document | Authentication, hashed passwords, timestamps, login lockout counters. |
| `UserPreference` | 1:1 Embedded | Explicit preferences (preferred/disliked genres & artists, mood, sliders). |
| `Song` | Document | Catalog metadata, streaming URL, normalized 10-dimensional acoustic vector. |
| `Artist` | Document | Artist entity, image URL, biography, genre associations. |
| `Album` | Document | Album entity, release date, artwork URL. |
| `ListeningEvent` | Append-Only Log | Telemetry capture: `play`, `pause`, `skip`, `complete`, dwell time, context. |
| `UserTasteProfile` | Materialized View | Precomputed dual-layer profile (long-term vs. recent recency decay). |
| `UserSongInteraction` | Sparse Matrix | Aggregated implicit feedback per `(userId, songId)` pair with weighted scores. |
| `UserSimilarity` | Materialized View | Pairwise cosine similarities between user interaction vectors. |
| `UserLibrary` | Document | User's saved/liked tracks updated atomically via `$addToSet` and `$pull`. |
| `Playlist` | Document | Custom user-curated playlists with track ordering and capacity caps ($\le 500$). |
| `RecommendationImpression` | Append-Only Log | Slate exposure logging for offline CTR and conversion tracking. |
| `EvaluationFeedback` | Document | Explicit ratings and academic benchmarking feedback. |

### Acoustic Feature Representation in `Song`
Every song contains normalized acoustic attributes in $[0.0, 1.0]$:
```typescript
acousticFeatures: {
  energy: number;          // Perceived intensity and activity
  danceability: number;    // Rhythmic stability and beat strength
  valence: number;         // Musical positiveness / happiness
  acousticness: number;    // Confidence track is acoustic / non-electronic
  tempo: number;           // Normalized speed (BPM)
  loudness: number;        // Normalized amplitude
  speechiness: number;     // Presence of spoken words
  instrumentalness: number;// Absence of vocal content
  liveness: number;        // Presence of live audience
}
```

---

## 5. The Recommendation Engine (Strategies R0–R5)

Located in `server/src/services/recommendation/`, the recommendation engine uses a 4-step pipeline:

### Step 1: Candidate Generation & Hard Filtering (`CandidateGenerator.ts`)
1. **Harvester:** Gathers candidates from user top genres, top artists, recent genres, collaborative neighbor favorites, and catalog trending tracks.
2. **Hard Constraints:**
   - **Deduplication:** Removes duplicate songs.
   - **Cool-Off Filter:** Withholds tracks completed in the last 2 hours to avoid repetition.
   - **Disliked Genres/Artists Filter:** Suppresses any songs matching the user's negative preferences (`score = 0.01`).

### Step 2: Scoring Strategies (R0–R5)

#### R0: Popularity Baseline (`PopularityStrategy.ts`)
- **Use Case:** Cold-start listeners with zero history.
- **Formula:**
  $$\text{score}_{\text{pop}} = \frac{\log(1 + \text{plays})}{\log(1 + \text{maxPlays})}$$

#### R1: Content Personalization (`ContentStrategy.ts`)
- **Use Case:** Listeners with onboarding preferences or established profiles.
- **Formula:**
  $$\text{score}_{\text{content}} = 0.35 \cdot S_{\text{genre}} + 0.25 \cdot S_{\text{artist}} + 0.30 \cdot (1 - d_{\text{acoustic}}) + 0.10 \cdot S_{\text{lang}}$$
  *(where $d_{\text{acoustic}}$ is the Euclidean/Cosine distance between song features and `UserTasteProfile.longTerm`).*

#### R2: Behavioral Recency Decay (`BehaviourStrategy.ts`)
- **Use Case:** Catching evolving musical tastes and recent listening shifts.
- **Logic:** Blends long-term habits (60%) with a 30-day sliding window (40%). Incorporates exponential half-life decay:
  $$w_i = e^{-\lambda \cdot \Delta t} \quad (\lambda = 0.05 \implies \text{half-life} \approx 13.8 \text{ days})$$
  Also rewards genres flagged as `rising` in the profile.

#### R3: Context-Aware Fit (`ContextStrategy.ts`)
- **Use Case:** Adapting recommendations to daily temporal routines.
- **Context Dimensions:**
  - `timeOfDay`: `morning` (05:00–11:59), `afternoon` (12:00–16:59), `evening` (17:00–21:59), `late_night` (22:00–04:59)
  - `dayOfWeek`: Monday through Sunday
- Compares candidate energy and valence against historical average engagement during that specific time block.

#### R4: Hybrid Strategy + Mood Blending (`HybridStrategy.ts`)
- **Use Case:** The primary personalized feed on the Home screen.
- **Formula:**
  $$\text{score}_{\text{hybrid}} = w_c S_{\text{content}} + w_b S_{\text{behaviour}} + w_x S_{\text{context}} + w_p S_{\text{popularity}} + \text{MoodBonus} + \text{NoveltyBonus}$$
- **Dynamic Confidence Redistribution:** If `profileConfidence < 0.25` (cold start), personal weights scale down proportionally and unallocated weight is absorbed by popularity, ensuring high-quality suggestions without fabricating user tastes.
- **8 Mood Profiles:** Supports `energetic`, `relaxed`, `happy`, `melancholic`, `focus`, `party`, `chill`, and `sleepy`, calculated as distance in 2D Valence-Energy space.

#### R5: Collaborative Hybrid (`CollaborativeHybridStrategy.ts`)
- **Use Case:** Serendipitous communal discovery.
- **Formula:** Cosine similarity over sparse implicit interaction scores:
  $$\text{sim}(u, v) = \frac{\sum_{s} r_{u,s} \cdot r_{v,s}}{\sqrt{\sum_{s} r_{u,s}^2} \cdot \sqrt{\sum_{s} r_{v,s}^2}}$$
  *(Implicit event weights: complete = +1.0, play = +0.1, pause = +0.05, skip = -0.75).*
- Blends collaborative score with content and behavioral signals, gracefully decaying back to R4 if user neighborhood density is sparse.

### Step 3: Diversity & Novelty Post-Processing
- **Artist Cap:** Maximum 2 tracks per artist (modulatable by user `diversityLevel` slider: 1 track if $\ge 0.85$, 3 if $\le 0.35$).
- **Album Cap:** Maximum 2 tracks per album.
- **Novelty Reserve Slots:** 0% to 30% of slate is reserved for unfamiliar songs with high novelty scores ($1 - \min(1, \text{plays}/5)$).

---

## 6. Explainable AI (XAI) & Privacy Preservation

Every single song returned by the recommendation engine includes an `explanationSignal` and user-facing text:

```typescript
{
  song: { ... },
  score: 0.884,
  reason: "Matches your taste in Synthwave and Electronic",
  reasonType: "genre",
  components: {
    popularity: 0.62,
    content: 0.91,
    behaviour: 0.84,
    context: 0.73,
    novelty: 0.45,
    collaborative: 0.82
  }
}
```

### Collaborative Privacy Guarantees
In compliance with privacy standards:
- Peer identities (names, emails, user IDs) are **never** returned to the client.
- The user sees: *"Listeners with tastes similar to yours enjoyed this"*.
- Vector similarity percentages are converted to qualitative badge indicators to avoid leaking raw matrix weights.

---

## 7. Scientific Offline Evaluation Framework

Located in `server/src/services/analytics/EvaluationService.ts` and viewable in the frontend `/analytics` dashboard:

### Academic Metrics Computed
1. **Precision@K (K=5, 10):** Proportion of recommendations that the user actually played/completed in the test window.
2. **Recall@K (K=5, 10):** Proportion of total test-window interactions retrieved in the top-$K$.
3. **HitRate@K (K=5, 10):** Whether at least one relevant track was surfaced in the top-$K$.
4. **NDCG@K (Normalized Discounted Cumulative Gain):** Rewards placing relevant songs at higher ranks.
5. **Intra-List Diversity (ILD):** Mean pairwise acoustic distance between songs in the recommended slate:
   $$\text{ILD} = \frac{2}{K(K-1)} \sum_{i=1}^{K} \sum_{j=i+1}^{K} d_{\text{acoustic}}(s_i, s_j)$$
6. **Novelty@K:** Inverse catalog popularity score rewarding unexpected discoveries over ubiquitous hits.
7. **Catalog Coverage:** Percentage of the active catalog surfaced across all recommendation slates.

### Strict Chronological Partitioning ($T_{split}$)
To prevent **future-data leakage**, evaluation partitions telemetry at:
$$T_{split} = T_{now} - \text{testDays}$$
- The recommendation engine is given access **only** to telemetry prior to $T_{split}$.
- Recommendations generated are evaluated strictly against interactions occurring after $T_{split}$.
- **Zero Fabrication:** If a user does not have sufficient history for both training and testing, `insufficientData: true` is returned rather than faking scores.

---

## 8. Audio Streaming & Persistent Queue Engine

Located in `client/src/contexts/AudioPlayerContext.tsx`:
- **HTML5 Audio Engine:** Persistent audio element managed via React Context that persists uninterrupted across page route transitions.
- **Queue Controls:** Play, pause, seek, volume control with local storage persistence, track scrubbing, shuffle, and 3 repeat modes (`off`, `one`, `all`).
- **Automatic Telemetry Dispatch:**
  - Sends a `play` event when track starts.
  - Sends a `pause` event when paused.
  - Sends a `skip` event if skipped before 80% duration.
  - Sends a `complete` event when playback completes past 80%.
  - Binds the active `recommendationRequestId` to the telemetry event to enable closed-loop CTR conversion analytics.

---

## 9. Application Security & Production Hardening

- **Password Security:** Salted hashes using `bcryptjs` with work factor **12** and a strict **72-character limit** (preventing silent bcrypt truncation vulnerabilities).
- **Timing Side-Channel Protection:** Executes a dummy constant-time bcrypt calculation when an unknown email attempts login, eliminating user enumeration via response timing differences.
- **Session Security:** Cryptographically signed JWTs stored in `HttpOnly`, `SameSite` cookies (`Secure` enabled in production).
- **NoSQL Injection Defense:** Incoming request parameters and JSON bodies are strictly validated with Zod schemas that sanitize or reject MongoDB query operators (`$ne`, `$gt`, `$where`).
- **Rate Limiting:** In-memory token bucket rate limiter restricting authentication routes to 60 requests / 15 minutes per IP.
- **IDOR Protection:** All user library mutations, playlist updates, and profile edits verify identity directly from the authenticated session token.

---

## 10. Frontend User Experience & Design System

### Design Aesthetic
- **Theme:** "Midnight Obsidian & Emerald"
  - Primary dark backgrounds: `#090D16` and `#111827`
  - Vibrant accent: Emerald `#10B981`
  - Subtle borders: `border-white/10` with glassmorphic backdrop blurs
- **Responsive Dual Layout:**
  - Desktop: Persistent navigation sidebar, music catalog grid, and bottom fixed player bar.
  - Mobile: Adaptive `AppShell`, bottom navigation tab bar, and floating `MiniPlayer`.

### The 18 Complete Frontend Pages (`client/src/pages/`)
1. `LandingPage`: Showcase hero, features overview, and demo CTA.
2. `LoginPage`: Secure email/password login with error handling.
3. `SignupPage`: Account creation with live password strength validation.
4. `OnboardingPage`: Interactive genre, artist, and mood selection wizard for cold-start users.
5. `HomePage`: Personalized dashboard, quick mood selectors, daily recommendations, and recent history.
6. `DiscoverPage`: Genre browsing, top trending tracks, and mood playlists.
7. `SearchPage`: Real-time debounced music search with acoustic filters.
8. `SongDetailPage`: Deep acoustic radar chart, track metadata, and similar tracks.
9. `RecommendationsPage`: Deep dive into R0–R5 strategies, explainability badges, and custom sliders.
10. `LibraryPage`: Liked songs, custom playlists, and listening history tabs.
11. `PlaylistPage`: Dynamic playlist creator, track reordering, and playback triggering.
12. `PlayerPage`: Full-screen immersive player with large artwork and synchronized queue.
13. `ProfilePage`: User taste profile breakdown, genre affinities, and personalization settings.
14. `AnalyticsPage`: Interactive offline evaluation suite and RecSys benchmarks.
15. `PrivacyPolicyPage`: Plain-language privacy disclosure and data rights.
16. `TermsAndConditionsPage`: Terms of service.
17. `NotFoundPage`: Custom 404 handler.
18. `PlaceholderPage`: Safe fallback component.

---

## 11. Codebase Directory Map

```text
TuneSense/
├── client/                               # Frontend React 18 Application
│   ├── src/
│   │   ├── components/                   # UI Primitives, Layout, Music Cards, Modals
│   │   │   ├── auth/                     # ProtectedRoute, Auth forms
│   │   │   ├── layout/                   # AppShell, Sidebar, TopNav, MiniPlayer
│   │   │   ├── music/                    # SongCard, AudioPlayer, QueueDrawer
│   │   │   ├── recommendation/           # RecommendationCard, ExplainabilityBadge
│   │   │   └── ui/                       # Button, Modal, Slider, Tabs, Badges
│   │   ├── contexts/                     # AudioPlayerContext, AuthContext, AppConfigContext
│   │   ├── pages/                        # 18 React page components
│   │   ├── routes/                       # AppRoutes.tsx route definitions
│   │   ├── services/                     # Typed REST API clients (Axios/Fetch)
│   │   └── types/                        # TypeScript interfaces for API payloads
│   ├── tailwind.config.js                # Custom Midnight Obsidian color tokens
│   ├── vercel.json                       # Vercel deployment rewrite rules
│   └── vite.config.ts                    # Vite build configuration
│
├── server/                               # Backend Express REST API
│   ├── src/
│   │   ├── config/                       # Env schemas, MongoDB connection, mood configs
│   │   ├── controllers/                  # Route handlers (Auth, Music, Recs, Analytics)
│   │   ├── middleware/                   # Auth middleware, rate limiter, error handler
│   │   ├── models/                       # 13 Mongoose domain models & materialized views
│   │   ├── providers/                    # JamendoProvider & offline catalog cache
│   │   ├── routes/                       # Express router definitions
│   │   ├── services/
│   │   │   ├── analytics/                # EvaluationService (NDCG, Precision, ILD)
│   │   │   ├── auth/                     # AuthService, password hashing, JWT
│   │   │   ├── listening/                # ListeningTelemetryService
│   │   │   ├── music/                    # MusicCatalogueService
│   │   │   ├── preference/               # UserPreferenceService
│   │   │   ├── profile/                  # UserTasteProfileService (Materialized View)
│   │   │   └── recommendation/           # RecommendationEngine, CandidateGenerator,
│   │   │       ├── strategies/           # R0 to R5 Strategy Implementations
│   │   │       ├── CandidateGenerator.ts
│   │   │       ├── CollaborativeService.ts
│   │   │       ├── RecommendationEngine.ts
│   │   │       ├── RecommendationExplainer.ts
│   │   │       └── RecommendationScorer.ts
│   │   ├── utils/                        # Verification suites & seedDemoData.ts
│   │   └── validators/                   # Zod payload schemas
│   ├── Procfile                          # Render / Railway backend deploy config
│   └── tsconfig.json
│
├── docs/                                 # Architectural Documentation
│   ├── architecture/                     # Architecture diagrams & query performance
│   ├── database/                         # Schema notes and indexing decisions
│   ├── decisions/                        # 10 Architectural Decision Records (ADRs)
│   │   ├── 0001-architecture-foundation.md
│   │   ├── 0002-music-provider.md
│   │   ├── 0003-authentication.md
│   │   ├── 0004-listening-events.md
│   │   ├── 0005-user-taste-profile.md
│   │   ├── 0006-recommendation-engine.md
│   │   ├── 0007-personalization-and-mood.md
│   │   ├── 0008-analytics-and-evaluation.md
│   │   ├── 0009-collaborative-personalization.md
│   │   └── 0010-library-and-playlists.md
│   └── LIVE_LAUNCH_CHECKLIST.md          # 37-step deployment checklist
│
├── package.json                          # Monorepo orchestration scripts
└── README.md                             # Repository README
```

---

## 12. Pre-Seeded Demo Personas & Verification

The database includes 4 pre-configured listener accounts in `server/src/utils/seedDemoData.ts`:

| Persona | Email | Password | Role & Test Purpose |
| :--- | :--- | :--- | :--- |
| **Alice Parker** | `alice@demo.tunesense.ai` | `DemoPassword123!` | **Power User:** Extensive electronic/ambient listening history; high-confidence taste profile. |
| **Bob Martinez** | `bob@demo.tunesense.ai` | `DemoPassword123!` | **Collaborative Peer:** Shares electronic taste with Alice; triggers **R5 Collaborative Filtering**. |
| **Charlie Vance** | `charlie@demo.tunesense.ai` | `DemoPassword123!` | **Diverse Taste:** Rock & Indie listener with explicit dislike for Electronic; tests negative genre suppression. |
| **Dana Sterling** | `dana@demo.tunesense.ai` | `DemoPassword123!` | **Cold-Start User:** Zero listening history; tests **R0 Popularity Baseline** and onboarding flow. |

---

## 13. How to Run the Application Locally

```bash
# 1. Install all dependencies across monorepo (root, client, and server)
npm run install:all

# 2. Configure environment variables
# Server: copy server/.env.example to server/.env and add your MONGODB_URI & JAMENDO_CLIENT_ID
# Client: copy client/.env.example to client/.env (VITE_API_BASE_URL=http://localhost:5000/api)

# 3. Seed demo catalog and test personas
npm run seed

# 4. Start both API server and client frontend concurrently
npm run dev:both

# Client runs at: http://localhost:5173
# Backend runs at: http://localhost:5000
# Health check:    http://localhost:5000/api/health

# 5. Run automated end-to-end integration verification (23 checks)
npm run verify
```

---

## 14. Sample Prompts to Ask ChatGPT About This Project

Copy and paste this document into ChatGPT, then ask any of the following questions:

1. *"Explain the mathematical difference between recommendation strategy R1 (Content) and R2 (Behaviour) in TuneSense."*
2. *"How does TuneSense handle the cold-start problem when a new user signs up?"*
3. *"Walk me through the lifecycle of a `ListeningEvent` from when a user clicks play in the React frontend to how it updates `UserTasteProfile` in MongoDB."*
4. *"How does TuneSense guarantee user privacy during collaborative recommendations (R5)?"*
5. *"Explain how TuneSense's offline evaluation framework prevents future-data leakage using $T_{split}$."*
6. *"How would I add a new recommendation strategy (e.g., audio tempo-matching for runners) to this codebase?"*
7. *"What security measures are implemented to protect against NoSQL injection and timing side-channel attacks?"*
