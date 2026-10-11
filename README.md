# TuneSense

> **Music that understands your vibe.**

**Academic Title:** *TuneSense: A Personalized, Context-Aware and Explainable Music Recommendation System Using NoSQL*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646cff.svg)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB%20Atlas-NoSQL-47A248.svg)](https://www.mongodb.com/atlas)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black.svg)](https://vercel.com)
[![Render](https://img.shields.io/badge/Backend%20API-Render-46E3B7.svg)](https://render.com)
[![Milestone](https://img.shields.io/badge/Milestone-Stages%201--16%20Complete-brightgreen.svg)]()

---

## 1. Overview

TuneSense is a responsive, personalized music recommendation web application built around a robust, document-oriented NoSQL architecture. The system models, captures, and transforms user listening behaviors and declared musical tastes into transparent, context-aware song recommendations.

TuneSense integrates:
- **Behavioral Personalization:** Implicit feedback derived from play, pause, skip, and completion telemetry.
- **Explicit Preferences:** User-declared favorite and disliked genres, artists, and languages.
- **Context Awareness:** Temporal listening patterns (time-of-day, day-of-week).
- **Mood-Aware Recommendation:** Real-time mood filtering across controlled acoustic targets.
- **Explainable Recommendations:** Transparent, human-readable rationales mapped directly from underlying scoring signals.
- **Classical User-Based Collaborative Filtering:** Sparsity-aware cosine similarity over user interaction vectors.
- **Recommendation Evaluation & Analytics:** Offline temporal evaluation framework and exposure telemetry.
- **Privacy-Aware Personalization:** Anonymized collaborative signals without peer PII leakage.
- **Premium Dark UI & Glassmorphism Design System (Stage 16):** Obsidian and luminous emerald palette (`#090D16`, `#10B981`), dual-experience layout (desktop sidebar + persistent player, mobile AppShell + MiniPlayer), and rich interactive components.
- **Catalogue Resilience:** Decoupled music provider with offline acoustic fallback cache and graceful stream degradation.
- **Cloud Deployment Architecture (Stage 15):** Production-ready topology deployed across Vercel (Frontend SPA), Render (Express REST API with secure cookie sessions), and MongoDB Atlas (Managed NoSQL cluster).

> **Academic Note:** TuneSense does not claim individual novel algorithmic machine-learning discovery; its academic contribution lies in the comprehensive, end-to-end integration of NoSQL document modeling, materialized view aggregation, and multi-layered explainable recommendation strategies.

---

## 2. Key Features

### Premium Dark UI & User Experience (Stage 16)
- **Midnight Aesthetic:** Curated obsidian/slate dark theme (`#090D16`, `#111827`) paired with luminous emerald accents (`#10B981`) and refined glassmorphic borders (`border-white/10`).
- **Responsive Dual Layout:**
  - **Desktop:** Persistent sidebar navigation, spacious content grid, and full-width bottom audio control bar.
  - **Mobile:** Mobile-first AppShell, bottom tab bar, and smooth floating `MiniPlayer`.
- **Hero & Card Primitives:**
  - `FeaturedTrackHero`: High-impact marquee banner showcasing top curated tracks with dynamic backdrop blur.
  - `TrackArtworkCard`: Interactive album artwork cards featuring hover vinyl disc slide-out animations.
  - `MoodSelector`: Quick-tap mood pills with real-time acoustic heuristic filtering.
  - `RecommendationCard`: Transparent cards presenting algorithm badges, acoustic metrics, and human-readable explanations.
- **End-to-End User Journeys:**
  - **Landing Page:** Engaging marketing showcase with feature highlights, testimonials, and interactive call-to-action.
  - **Onboarding Wizard:** 4-step interactive flow capturing musical taste seeds, favorite artists, and acoustic preferences.
  - **Home Dashboard:** Dynamic time-aware greeting, "Jump Back In" recently played reel, curated mixes, and mood discovery.
  - **Discover Page:** Filterable catalogue browser with genre chips and instant preview playback.
  - **Dedicated Recommendations Page:** Deep dive into R0–R5 recommendation strategies with score breakdowns.
  - **Library & Playlists:** Favorite songs collection, custom playlist creation with modal management, and listening history.
  - **Full-Screen Player:** Expanded view featuring lyrics, playback queue drawer with drag-free reordering, and acoustic radar breakdown.

### Authentication & Identity
- **Account Management:** User registration, login, and secure session management.
- **JWT Authentication:** Signed JSON Web Tokens stored securely in HTTP-only cookies (`SameSite=None` with `Secure` in production cross-origin topologies; `SameSite=Lax` in development).
- **Password Security:** Salted password hashing with `bcrypt` (work factor 12, max 72 characters).
- **Anti-Spoofing & Timing Defense:** Protected endpoints derive identity from verified sessions; constant-time dummy password hashing prevents email enumeration.
- **Rate Limiting & Security Headers:** Standard HTTP security headers (`nosniff`, `DENY`, `HSTS`) and token-bucket rate limiting on auth endpoints.

### User Library, Playlists & Audio Queue
- **User Library (Liked Songs):** Persistent user library tracking favorite tracks with idempotent like/unlike operations.
- **Custom Playlists:** Full playlist creation, updating, deletion, and track management with bounded size limits (<= 500 tracks).
- **Playback Queue & Player:** Continuous audio playback queue management, active track state, volume, seek control, shuffle, and repeat modes.

### Music Catalogue & Streaming Resilience
- **Provider Abstraction:** Clean `IMusicProvider` interface isolating external data sources from domain logic.
- **Jamendo API Integration:** Streaming legal, Creative Commons-licensed audio tracks.
- **Catalogue Search & Details:** Fast search and retrieval across tracks, artists, and albums.
- **Resilient Fallback Cache:** Offline acoustic fallback cache ensuring continuous recommendations and playback even during external provider latency or network interruptions.

### Personalization & Taste Intelligence
- **Dynamic Taste Profile:** Dual-layer aggregation combining long-term taste with 30-day exponential recency decay ($\lambda = 0.05$).
- **Acoustic Profiling:** Running averages for valence, energy, danceability, and acousticness.
- **Controlled Mood Taxonomy:** 8 predefined moods (`happy`, `energetic`, `relaxed`, `focused`, `romantic`, `sad`, `calm`, `nostalgic`) with deterministic acoustic heuristics.
- **Fine-Grained Controls:** User-adjustable exploration (novelty) and diversity sliders, alongside explicit genre and artist blacklists.

### Recommendation Engine (R0–R5)
TuneSense implements six distinct, composable recommendation strategies:

- **R0 — Popularity Baseline:** Ranks candidates by global catalog engagement and play counts.
- **R1 — Content + Taste Personalization:** Scores songs matching the user's inferred acoustic preferences and favorite genres/artists.
- **R2 — Behavioural Personalization:** Emphasizes emerging short-term trends, completion frequency, and repeat listening habits.
- **R3 — Context-Aware Personalization:** Aligns candidate energy and tempo with historical time-of-day and day-of-week patterns.
- **R4 — Hybrid + Mood Strategy:** Dynamically balances content, behavioral, contextual, and active mood signals with cold-start adaptation.
- **R5 — Collaborative Personalization:** Classical user-based collaborative filtering:
  - Materialized sparse user-song interaction matrices.
  - Pairwise cosine similarity computation over common song interactions.
  - Popularity-bias dampening to surface niche peer favorites.
  - Dynamic weight redistribution based on collaborative confidence.
  - Cold-start graceful degradation to content and popularity baselines.

---

## 3. Explainability

TuneSense provides transparent, human-readable reasons for every recommended song based on the dominant scoring signal:

| Recommendation Context | Example Reason String |
| :--- | :--- |
| **Content Match** | *"Matches your taste in Synthwave and Electronic"* |
| **Behavioral Trend** | *"Based on your recent listening habits"* |
| **Contextual Fit** | *"Fits your usual energetic evening listening"* |
| **Mood Alignment** | *"Picked for your relaxed mood"* |
| **Collaborative Filtering** | *"Listeners with tastes similar to yours enjoyed this"* |
| **Cold Start / Baseline** | *"Popular and trending on TuneSense"* |

### Privacy Protection
Collaborative explanations are aggregate and strictly privacy-safe. TuneSense never reveals:
- User IDs or database ObjectIDs
- Peer names, usernames, or email addresses
- Raw cosine similarity percentages or peer ranking scores

---

## 4. NoSQL Architecture & Data Modeling

TuneSense is architected around MongoDB's document model, utilizing materialized views, atomic upserts, and aggregation pipelines.

```
React Client (Vercel SPA)
       │
       ▼  HTTP / REST (credentials: include)
Express API Server (Render, TypeScript, Zod, JWT)
       │
       ├──► Authentication Service (User, UserPreference)
       ├──► Music Service (JamendoProvider, Song, Artist, Album, FallbackCache)
       ├──► Telemetry Ingestion (ListeningEvent, RecommendationImpression)
       ├──► Taste Intelligence (UserTasteProfile Materialized View)
       ├──► Collaborative Service (UserSongInteraction, UserSimilarity)
       └──► Recommendation Engine (R0–R5 Strategies)
              │
              ▼
       MongoDB Atlas
```

### Core MongoDB Collections

| Collection | Schema Pattern | Primary Purpose |
| :--- | :--- | :--- |
| `User` | Document | Core credentials, authentication state, and registration metadata |
| `UserPreference` | 1:1 Embedded Document | Explicit favorite/disliked genres, artists, and control slider settings |
| `Song` | Document | Normalized catalog metadata, audio stream URLs, and acoustic feature vectors |
| `Artist` | Document | Artist metadata, biography, and image references |
| `Album` | Document | Album metadata, cover art, and release dates |
| `ListeningEvent` | Append-Only Log | High-resolution telemetry capturing `play`, `pause`, `skip`, and `complete` events |
| `UserTasteProfile` | Materialized View | Precomputed long-term/recent genre weights, acoustic distributions, and confidence |
| `UserSongInteraction` | Sparse Matrix Collection | Aggregated implicit engagement scores per `(userId, songId)` pair |
| `UserSimilarity` | Materialized View | Precomputed cosine similarity scores between top peer neighbors |
| `UserLibrary` | Document | User saved/liked tracks repository and library collection |
| `Playlist` | Document | User-created custom playlists with bounded capacity (<= 500 tracks) |
| `RecommendationImpression`| Append-Only Log | Recommendation delivery logs linking recommended tracks to request IDs for CTR tracking |
| `EvaluationFeedback` | Survey Log | Subjective Likert-scale feedback for recommendation and mood accuracy |

### Materialized View Pipelines

```
ListeningEvent (Append-only logs)
       │
       ├──► UserTasteProfile (Precomputed taste profile for R1, R2, R4)
       │
       └──► UserSongInteraction (Sparse matrix aggregation)
                   │
                   └──► UserSimilarity (Pairwise Cosine Similarity)
                               │
                               └──► Collaborative Recommendations (R5)
```

### Why NoSQL for TuneSense?
1. **Schema Flexibility:** Supports evolving acoustic vectors, dynamic genre weight maps, and diverse provider payloads.
2. **Materialized Derived Collections:** Expensive aggregation pipelines (cosine similarity, recency decay) are precomputed to ensure responsive recommendation generation without repetitive full-database scans.
3. **Append-Only Telemetry:** High-throughput logging of `ListeningEvent` and `RecommendationImpression` documents without locking relational tables.
4. **Compound Index Optimization:** Targeted indexes (`{ userId: 1, createdAt: -1 }`, `{ userId: 1, songId: 1 }`) eliminate full collection scans.

---

## 5. Recommendation Pipeline

```
User Request (with session & optional ?mood=...)
       │
       ▼
1. Candidate Generation
   ├── Top user genres & artists (Content seeds)
   ├── Trending catalogue tracks (Popularity seeds)
   └── Peer-recommended tracks (Collaborative seeds via UserSimilarity)
       │
       ▼
2. Filtering & Hard Constraints
   ├── Suppress songs with recent completion cool-off (< 2 hours)
   ├── Exclude user's disliked genres and artists
   └── Deduplicate candidate pool across provider IDs
       │
       ▼
3. Multi-Strategy Scoring (Normalized [0, 1])
   ├── Calculate R0 Popularity score
   ├── Calculate R1 Content & Acoustic similarity
   ├── Calculate R2 Behavioural recency trend score
   ├── Calculate R3 Contextual alignment score
   └── Calculate R5 Collaborative neighbor score
       │
       ▼
4. Hybrid Combination & Dynamic Weighting
   ├── Adjust collaborative weight based on peer confidence metric
   ├── Apply mood acoustic heuristics if mood is active
   └── Blend normalized linear scores into composite ranking
       │
       ▼
5. Post-Processing & Diversity Enforcement
   ├── Artist limit enforcement (max 2 tracks per artist)
   ├── Album limit enforcement (max 2 tracks per album)
   └── Novelty exploration slot allocation (controlled by user slider)
       │
       ▼
6. Transparent Explanation Generation
   └── Identify primary signal contributor and map to friendly rationale
       │
       ▼
7. Telemetry & Impression Recording
   └── Persist RecommendationImpression for conversion and CTR tracking
```

---

## 6. Analytics & Offline Evaluation Framework

TuneSense includes a built-in evaluation framework designed to benchmark recommendation algorithms offline without data leakage.

### Implemented Academic Metrics
- **Precision@K (K=5, 10):** Proportion of recommended items that the user engaged with in the test window.
- **Recall@K (K=5, 10):** Proportion of total test window interactions captured by the top-K recommendations.
- **HitRate@K (K=5, 10):** Binary indicator of whether at least one relevant item appeared in the top-K.
- **NDCG@K:** Normalized Discounted Cumulative Gain accounting for position-dependent ranking quality.
- **Intra-List Diversity (ILD):** Pairwise acoustic and genre dissimilarity across recommended items.
- **Novelty@K:** Inverse global popularity score rewarding unexpected discoveries.
- **Catalog Coverage:** Percentage of the catalogue surfaced across user recommendation slates.
- **Collaborative Coverage:** Percentage of users with sufficient peer overlap to receive collaborative candidates.

### Temporal Train/Test Split
To prevent **future-data leakage**, the evaluation suite partitions listening history chronologically at $T_{split} = T_{now} - \text{testDays}$. Taste profiles and similarities are strictly derived from $T < T_{split}$ to predict interactions occurring at $T \ge T_{split}$.

> **Integrity Note:** The framework adheres to a strict zero-fabrication standard. If insufficient listening data exists, the evaluation returns `insufficientData: true` rather than synthetic metric values.

---

## 7. Security & Privacy Controls

- **Password Hashing:** `bcryptjs` utilizing work factor **12** with strict 72-character maximum constraint to prevent silent truncation.
- **Timing Side-Channel Protection:** Dummy bcrypt verification on non-existent accounts ensures uniform response timing.
- **JWT Session Security:** Cryptographically signed tokens stored in `HttpOnly` cookies (`SameSite=None; Secure` in production; `SameSite=Lax` in development) with Express `trust proxy` enabled.
- **Rate Limiting:** Dedicated token-bucket rate limiter restricting sensitive authentication endpoints to 60 requests / 15 minutes per IP.
- **Security Headers:** Strict response headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Strict-Transport-Security`, `Referrer-Policy`).
- **Access Control & IDOR Defense:** All user-scoped operations verify ownership from session tokens; system-wide evaluation endpoints are restricted to administrator and demo accounts.
- **Error Sanitization:** Centralized error handling stripping stack traces and database internal messages in production environments.
- **Peer Privacy:** Zero exposure of peer PII, user IDs, or raw similarity scores in collaborative recommendations.

---

## 8. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 6, TypeScript 5.7, Tailwind CSS 3.4, React Router 6, Lucide React |
| **Backend** | Node.js (v20+), Express 4, TypeScript 5.7, Zod 3.24, JWT (`jsonwebtoken`), `bcryptjs`, `cookie-parser`, CORS |
| **Database** | MongoDB / MongoDB Atlas, Mongoose 9+ (NoSQL ODM) |
| **Music Integration**| Jamendo API v3.0 via decoupled `IMusicProvider` with offline acoustic fallback cache |
| **Deployment Targets**| **Vercel** (Frontend SPA), **Render** (Backend API), **MongoDB Atlas** (Cloud Database) |

---

## 9. Project Structure

```
TuneSense/
├── client/                     # Mobile-First & Desktop Responsive React SPA
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # UI primitives, layout shell, music controls, recommendations
│   │   │   ├── auth/           # ProtectedRoute, AuthForms
│   │   │   ├── layout/         # AppShell, DesktopSidebar, BottomNavigation, MobileHeader
│   │   │   ├── music/          # MiniPlayer, DesktopPlayer, SongCard, FeaturedTrackHero, TrackArtworkCard
│   │   │   ├── recommendation/ # RecommendationCard, MoodSelector, PreferenceSliders
│   │   │   └── ui/             # Buttons, Modals, Inputs, Badges, Toast
│   │   ├── constants/          # Navigation config, design tokens, mock fixtures
│   │   ├── contexts/           # AuthContext, AudioPlayerContext, ConfigContext
│   │   ├── hooks/              # Custom hooks (useAudioPlayer, useRecommendations)
│   │   ├── pages/              # Landing, Onboarding, Home, Discover, Recommendations, Library, Player, SongDetail, Profile, Login, Signup
│   │   ├── routes/             # AppRoutes config
│   │   ├── services/           # Typed API clients (auth, music, recommendations, analytics)
│   │   └── types/              # Domain interfaces
│   ├── package.json
│   ├── tailwind.config.js      # Midnight dark theme tokens & emerald accents
│   ├── vercel.json             # SPA client-side rewrite rules
│   └── vite.config.ts
│
├── server/                     # Express REST API Server
│   ├── src/
│   │   ├── config/             # Zod environment schema & DB connection
│   │   ├── controllers/        # Auth, music, preferences, recommendations, analytics, taste, library controllers
│   │   ├── middleware/         # Auth verification, rate limiting, security headers, error handler
│   │   ├── models/             # 13 Mongoose domain schemas
│   │   ├── providers/          # IMusicProvider & JamendoProvider (with fallback resilience)
│   │   ├── routes/             # REST endpoint routers
│   │   ├── services/           # RecommendationEngine, TasteProfile, Collaborative, Analytics, Library, MusicCatalogueService
│   │   ├── utils/              # Verification suites (Stages 4–14), demo seeder
│   │   └── validators/         # Zod request validators
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                       # Technical Documentation
│   ├── LIVE_LAUNCH_CHECKLIST.md# 37-step live verification and cloud launch checklist
│   ├── STAGE13_REAL_DATA_AND_DEPLOYMENT.md
│   ├── STAGE14_LIVE_INTEGRATION_AND_DEPLOYMENT.md
│   ├── deployment.md           # Comprehensive cloud deployment guide (Vercel + Render)
│   ├── architecture/           # Architecture overviews & data flows
│   ├── database/               # Schema design notes & indexing rationale
│   ├── security/               # Security reviews & risk assessments
│   └── testing/                # Stage verification reports (Stages 4–14)
│
├── package.json                # Monorepo orchestration scripts
└── README.md                   # Project documentation
```

---

## 10. Local Setup & Installation

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- MongoDB instance (Local MongoDB or MongoDB Atlas connection URI)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/kousthub-eswar/tunesense.git
cd tunesense

# Install root, client, and server dependencies
npm run install:all
```

### 2. Configure Environment Variables

Create `server/.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=your_development_jwt_secret_key_min_32_characters
JWT_EXPIRES_IN=7d

# Live database and catalogue integration:
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/tunesense?retryWrites=true&w=majority
MONGODB_DB_NAME=tunesense
JAMENDO_CLIENT_ID=your_jamendo_client_id
```

Create `client/.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Start Development Servers
```bash
# Terminal 1: Backend API
npm run dev:server

# Terminal 2: Frontend Client
npm run dev
```
- Client runs at: `http://localhost:5173`
- Server runs at: `http://localhost:5000`

### 4. Build Production Bundles
```bash
npm run build
```

---

## 11. Cloud Deployment Guide (Stage 15)

TuneSense is architected for seamless multi-cloud production deployment.

### 1. Database — MongoDB Atlas
1. Create a cluster on [MongoDB Atlas](https://cloud.mongodb.com/).
2. Under **Database Access**, create a user with read/write privileges on `tunesense`.
3. Under **Network Access**, allow access from your deployment IP range or `0.0.0.0/0`.
4. Copy the URI for use in the backend environment.

### 2. Backend API — Render
1. Create a new **Web Service** connected to your repository on [Render](https://render.com/).
2. Configure settings:
   - **Root Directory:** `server`
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
3. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5000` (or leave default assigned by Render)
   - `MONGODB_URI`: `<Atlas Connection String>`
   - `MONGODB_DB_NAME`: `tunesense`
   - `JAMENDO_CLIENT_ID`: `<Your Jamendo Client ID>`
   - `JWT_SECRET`: `<Secure random 32+ char string>`
   - `CLIENT_ORIGIN`: `https://<your-frontend-app>.vercel.app`
   - `CLIENT_URL`: `https://<your-frontend-app>.vercel.app`

### 3. Frontend Client — Vercel
1. Import the repository into [Vercel](https://vercel.com/).
2. Configure project:
   - **Framework Preset:** Vite
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add Environment Variables:
   - `VITE_API_BASE_URL`: `https://<your-backend-service>.onrender.com/api`
4. The included `client/vercel.json` ensures seamless client-side SPA routing rewrites.

---

## 12. Deterministic Demo Data

TuneSense provides a deterministic seeding script to populate development and test environments with synthetic users, acoustic song features, explicit preferences, and listening histories for collaborative filtering demonstration.

```bash
# Seed deterministic demo data
cd server
npm run seed:demo

# Clean demo data
npm run clean:demo
```
*Note: Demo data is strictly for local verification and does not represent real production users.*

---

## 13. Verification & Testing

TuneSense includes end-to-end staged verification suites validating architectural integrity, security, mathematical scoring, catalogue resilience, and regressions.

```bash
# Compile TypeScript
npm run build --prefix server

# Run Stage Verification Suites
node server/dist/utils/verifyStage14.js
node server/dist/utils/verifyStage13.js
node server/dist/utils/verifyStage12.js
node server/dist/utils/verifyStage11.js
node server/dist/utils/verifyStage10.js
node server/dist/utils/verifyStage9.js
node server/dist/utils/verifyStage8.js
node server/dist/utils/verifyStage7.js
node server/dist/utils/verifyStage6.js
node server/dist/utils/verifyStage5.js
node server/dist/utils/verifyStage4.js
```

### Verification Status

| Suite | Status | Focus / Notes |
| :--- | :---: | :--- |
| **Stage 16 UI Redesign & Resilience** | **PASS** | Midnight dark theme, dual-layout, and resilient catalogue fallback |
| **Stage 15 Cloud Deployment** | **PASS** | Vercel SPA routing + Render cross-origin cookie session hardening |
| **Stage 14 Live Validation** | **PASS** | 23 / 23 checks passed (Live Atlas + Jamendo verified) |
| **Stage 13 Deployment Readiness** | **PASS** | Production build assets and configuration validated |
| **Stage 12 Library & Playlists** | **PASS** | Library, playlist bounds (<= 500 tracks), and IDOR protections passed |
| **Stage 11 Production Hardening** | **PASS** | Error sanitization, bcrypt factor 12, rate limiting passed |
| **Stage 10 Collaborative Filtering** | **PASS** | 34 / 34 checks passed (Cosine similarity, sparse matrices) |
| **Stage 9 Analytics & Evaluation** | **PASS** | 27 / 27 checks passed (Offline NDCG, Recall, Coverage) |
| **Stage 8 Mood & User Controls** | **PASS** | 24 / 24 checks passed (8-mood taxonomy, exploration sliders) |
| **Stage 7 Hybrid Recommendation** | **PASS** | Multi-strategy composite scoring passed |
| **Stage 6 Dynamic Taste Profile** | **PASS** | Recency decay ($\lambda = 0.05$) and acoustic averages passed |
| **Stage 5 Listening Telemetry** | **PASS** | High-throughput append-only event logging passed |
| **Stage 4 Authentication & Identity** | **PASS** | JWT in HTTP-only cookies, constant-time password check passed |

---

## 14. Current Project Status

**Current Milestone:** **Stages 1–16 — Complete, Hardened, Redesigned & Production-Ready**  
**Status:** **Production Ready**

- [x] **Stage 16:** Premium Midnight Dark glassmorphic design system (`#090D16`, `#10B981`)
- [x] **Stage 16:** Responsive dual layout (Desktop sidebar + Desktop player bar, Mobile AppShell + MiniPlayer)
- [x] **Stage 16:** Catalogue resilience with offline acoustic metadata cache and streaming fallbacks
- [x] **Stage 16:** High-converting Landing page, 4-step Onboarding wizard, and deep Recommendations breakdown page
- [x] **Stage 15:** Cloud deployment configurations for Render (API) and Vercel (SPA)
- [x] **Stage 14:** MongoDB Atlas live cluster & Jamendo API integration verified
- [x] **Stage 13:** Production builds & deployment readiness verified
- [x] **Stage 12:** Custom playlists with capacity limits and user library management
- [x] **Stage 11:** Production error sanitization, token-bucket rate limiting, and security headers
- [x] **Stage 10:** Classical user-based collaborative filtering over sparse interactions (batched O(1) candidate query)
- [x] **Stage 9:** Offline evaluation framework (NDCG, Precision, Recall, Diversity, Novelty)
- [x] **Stage 8:** Controlled 8-mood acoustic taxonomy and explicit user controls
- [x] **Stage 7:** Hybrid recommendation engine (R0–R5 strategies)
- [x] **Stage 6:** Dynamic user taste profile with exponential recency decay
- [x] **Stage 5:** Append-only listening event telemetry ingestion
- [x] **Stage 4:** JWT authentication and HTTP-only cookie security (bcrypt work factor 12)

---

## 15. Academic Contribution

Developed as an academic NoSQL project, TuneSense demonstrates:
1. **Document-Oriented Data Modeling:** Applying document schemas to represent complex, nested musical preferences and acoustic profiles.
2. **Materialized View Pattern:** Utilizing derived MongoDB collections (`UserTasteProfile`, `UserSongInteraction`, `UserSimilarity`) to eliminate compute-heavy aggregation bottlenecks on user read paths.
3. **Sparse Matrix Storage in NoSQL:** Managing sparse user-item interaction pairs efficiently without relational table locks or dense matrix overhead.
4. **Append-Only Event Sourcing:** Structuring high-volume playback logs (`ListeningEvent`, `RecommendationImpression`) for analytical querying and conversion tracking.
5. **NoSQL Aggregation Pipelines:** Multi-stage `$match`, `$group`, `$facet`, `$lookup`, and `$project` pipelines for real-time telemetry metrics.
6. **Compound Index Strategy:** Index optimization tailored directly to temporal and user-isolation query access patterns.
7. **Transparent RecSys Design:** Proving that personalized and collaborative recommendations can remain explainable, deterministic, and privacy-preserving.

---

## 16. Limitations

- **Interaction Density:** Collaborative filtering (R5) depends on overlapping interactions between users; sparse catalogues will rely more heavily on content (R1) and popularity (R0) baselines.
- **Cold-Start Latency:** New users with zero listening events initially receive popularity-based and declared-preference recommendations until behavioral telemetry accumulates.
- **User-Based Scaling:** While precomputed materialized similarity views scale well for thousands of users, multi-million user deployments would benefit from item-based collaborative filtering or matrix approximation.
- **External Catalog Dependencies:** Audio availability and track metadata are bound by external Creative Commons API constraints.
- **Model Scope:** Does not employ deep neural networks, vector embedding databases, or large language models by deliberate architectural design.

---

## 17. Future Scope

- Item-to-item collaborative filtering and offline matrix factorization (ALS).
- Background scheduled cron workers for asynchronous similarity matrix recomputation.
- Native mobile packaging using Capacitor.
- Distributed Redis caching for high-frequency session and candidate reads.
- Infrastructure-level rate limiting and Web Application Firewall (WAF) integration.
- Expanded music metadata integration (MusicBrainz / AcousticBrainz).

---

## 18. License

MIT License. See [LICENSE](LICENSE) for details.
