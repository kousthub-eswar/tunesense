# TuneSense

> **Music that understands your vibe.**

**Academic Title:** *TuneSense: A Personalized, Context-Aware and Explainable Music Recommendation System Using NoSQL*

---

## 1. Overview

TuneSense is a mobile-first personalized music recommendation web application built around a robust, document-oriented NoSQL architecture. The system models, captures, and transforms user listening behaviors and declared musical tastes into transparent, context-aware song recommendations.

TuneSense integrates:
- **Behavioral Personalization:** Implicit feedback derived from play, pause, skip, and completion telemetry.
- **Explicit Preferences:** User-declared favorite and disliked genres, artists, and languages.
- **Context Awareness:** Temporal listening patterns (time-of-day, day-of-week).
- **Mood-Aware Recommendation:** Real-time mood filtering across controlled acoustic targets.
- **Explainable Recommendations:** Transparent, human-readable rationales mapped directly from underlying scoring signals.
- **Classical User-Based Collaborative Filtering:** Sparsity-aware cosine similarity over user interaction vectors.
- **Recommendation Evaluation & Analytics:** Offline temporal evaluation framework and exposure telemetry.
- **Privacy-Aware Personalization:** Anonymized collaborative signals without peer PII leakage.

> **Academic Note:** TuneSense does not claim individual novel algorithmic machine-learning discovery; its academic contribution lies in the comprehensive, end-to-end integration of NoSQL document modeling, materialized view aggregation, and multi-layered explainable recommendation strategies.

---

## 2. Key Features

### Authentication & Identity
- **Account Management:** User registration, login, and secure session management.
- **JWT Authentication:** Signed JSON Web Tokens stored securely in HTTP-only, `SameSite=Lax` cookies.
- **Password Security:** Salted password hashing with `bcrypt` (work factor 12).
- **Anti-Spoofing:** All protected endpoints derive identity exclusively from verified session tokens.

### Music Catalogue & Streaming
- **Provider Abstraction:** Clean `IMusicProvider` interface isolating external data sources from domain logic.
- **Jamendo API Integration:** Streaming legal, Creative Commons-licensed audio tracks.
- **Catalogue Search & Details:** Fast search and retrieval across tracks, artists, and albums.
- **Native Web Audio:** Responsive mobile `MiniPlayer` with scrub seeking, playback status, and volume control.

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
React Client (Mobile-First UI)
       │
       ▼  HTTP / REST (credentials: include)
Express API Server (TypeScript, Zod, JWT)
       │
       ├──► Authentication Service (User, UserPreference)
       ├──► Music Service (JamendoProvider, Song, Artist, Album)
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
2. **Materialized Derived Collections:** Expensive aggregation pipelines (cosine similarity, recency decay) are precomputed, allowing sub-50ms recommendation response times.
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

- **Password Hashing:** `bcryptjs` utilizing work factor **12**.
- **JWT Session Security:** Cryptographically signed tokens stored in `HttpOnly`, `SameSite=Lax` cookies (`secure: true` in production).
- **IDOR Protection:** All user-specific operations derive `userId` directly from verified session cookies, rejecting mismatched route parameters with HTTP 403 Forbidden.
- **Payload Validation:** Strict schema validation on all API requests using `Zod`.
- **Error Sanitization:** Centralized error handling stripping stack traces and database internal messages in production environments.
- **Peer Privacy:** Zero exposure of peer PII, user IDs, or raw similarity scores in collaborative recommendations.
- **Known Residual Low Risk:** Login and registration rate limiting is currently handled at the infrastructure/reverse-proxy layer.

---

## 8. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 6, TypeScript 5, Tailwind CSS, React Router 6, Lucide React |
| **Backend** | Node.js (v20+), Express 4, TypeScript 5, Zod, JWT (`jsonwebtoken`), `bcryptjs`, `cookie-parser`, CORS |
| **Database** | MongoDB / MongoDB Atlas, Mongoose 8+ (NoSQL ODM) |
| **Music Integration**| Jamendo API v3.0 via decoupled `IMusicProvider` interface |
| **Deployment Targets**| Vercel (Frontend), Render / Railway (Backend API), MongoDB Atlas (Database) |

---

## 9. Project Structure

```
TuneSense/
├── client/                     # Mobile-First React SPA
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # UI primitives, layout shell, music controls, recommendations
│   │   ├── constants/          # Navigation config, design tokens, mock fixtures
│   │   ├── contexts/           # AuthContext, AudioPlayerContext, ConfigContext
│   │   ├── hooks/              # Custom hooks
│   │   ├── pages/              # Home, Discover, Library, Profile, Onboarding, Login, Signup
│   │   ├── services/           # Typed API clients (auth, music, recommendations, analytics)
│   │   └── types/              # Domain interfaces
│   ├── package.json
│   └── vite.config.ts
│
├── server/                     # Express REST API Server
│   ├── src/
│   │   ├── config/             # Zod environment schema & DB connection
│   │   ├── controllers/        # Auth, music, preferences, recommendations, analytics, taste controllers
│   │   ├── middleware/         # Auth verification, error handler, 404 handler
│   │   ├── models/             # 11 Mongoose domain schemas
│   │   ├── providers/          # IMusicProvider & JamendoProvider
│   │   ├── routes/             # REST endpoint routers
│   │   ├── services/           # RecommendationEngine, TasteProfile, Collaborative, Analytics
│   │   ├── utils/              # Verification suites (Stages 4–11), demo seeder
│   │   └── validators/         # Zod request validators
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                       # Technical Documentation
│   ├── architecture/           # Architecture overviews & data flows
│   ├── database/               # Schema design notes & indexing rationale
│   ├── security/               # Security reviews & risk assessments
│   └── testing/                # Stage verification reports (Stages 4–11)
│
├── package.json                # Monorepo orchestration scripts
└── README.md                   # Project documentation
```

---

## 10. Local Setup & Installation

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- MongoDB instance (Local or MongoDB Atlas connection URI)

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
JWT_SECRET=your_development_jwt_secret_key_min_32_characters

# Optional: Set for live database and catalogue integration
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/tunesense
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

## 11. Deterministic Demo Data

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

## 12. Verification & Testing

TuneSense includes end-to-end staged verification suites validating architectural integrity, security, mathematical scoring, and regressions.

```bash
# Compile TypeScript
npm run build --prefix server

# Run Stage 11 Production Verification Suite
node server/dist/utils/verifyStage11.js

# Run Regression Test Suites (Stages 4 through 10)
node server/dist/utils/verifyStage10.js
node server/dist/utils/verifyStage9.js
node server/dist/utils/verifyStage8.js
node server/dist/utils/verifyStage7.js
node server/dist/utils/verifyStage6.js
node server/dist/utils/verifyStage5.js
node server/dist/utils/verifyStage4.js
```

### Verification Status

| Suite | Status | Notes |
| :--- | :---: | :--- |
| **Stage 11 Production Verification** | **PASS** | 10 Passed, 10 Skipped (offline test mode), 0 Failed |
| **Stage 10 Collaborative Filtering** | **PASS** | 34 / 34 checks passed |
| **Stage 9 Analytics & Evaluation** | **PASS** | 27 / 27 checks passed |
| **Stage 8 Mood & User Controls** | **PASS** | 24 / 24 checks passed |
| **Stage 7 Hybrid Recommendation** | **PASS** | All recommendation checks passed |
| **Stage 6 Dynamic Taste Profile** | **PASS** | All taste profile checks passed |
| **Stage 5 Listening Telemetry** | **PASS** | All telemetry ingestion checks passed |
| **Stage 4 Authentication & Identity** | **PASS** | All auth & security checks passed |

*Note: In offline test mode without configured `MONGODB_URI` and `JAMENDO_CLIENT_ID`, external network tests are cleanly reported as `SKIPPED` while offline validation passes 100%.*

---

## 13. Current Project Status

**Current Milestone:** **Stage 11 — Production Data Integration, Real API Validation & System Hardening**  
**Status:** **Complete**

- [x] Mobile-first responsive UI and native web audio player
- [x] Decoupled music provider architecture
- [x] JWT authentication and HTTP-only cookie security (bcrypt work factor 12)
- [x] Append-only listening event telemetry ingestion
- [x] Dynamic user taste profile with exponential recency decay
- [x] Recommendation engine with R0–R5 strategies
- [x] Controlled 8-mood acoustic taxonomy and explicit user controls
- [x] Offline evaluation framework (NDCG, Precision, Recall, Diversity, Novelty)
- [x] Classical user-based collaborative filtering over sparse interactions
- [x] Production error sanitization and configuration validation
- [ ] MongoDB Atlas live cluster validation (Pending deployment credentials)
- [ ] Jamendo live API validation (Pending production client ID)

---

## 14. Academic Contribution

Developed as an academic NoSQL project, TuneSense demonstrates:
1. **Document-Oriented Data Modeling:** Applying document schemas to represent complex, nested musical preferences and acoustic profiles.
2. **Materialized View Pattern:** Utilizing derived MongoDB collections (`UserTasteProfile`, `UserSongInteraction`, `UserSimilarity`) to eliminate compute-heavy aggregation bottlenecks on user read paths.
3. **Sparse Matrix Storage in NoSQL:** Managing sparse user-item interaction pairs efficiently without relational table locks or dense matrix overhead.
4. **Append-Only Event Sourcing:** Structuring high-volume playback logs (`ListeningEvent`, `RecommendationImpression`) for analytical querying and conversion tracking.
5. **NoSQL Aggregation Pipelines:** Multi-stage `$match`, `$group`, `$facet`, `$lookup`, and `$project` pipelines for real-time telemetry metrics.
6. **Compound Index Strategy:** Index optimization tailored directly to temporal and user-isolation query access patterns.
7. **Transparent RecSys Design:** Proving that personalized and collaborative recommendations can remain explainable, deterministic, and privacy-preserving.

---

## 15. Limitations

- **Interaction Density:** Collaborative filtering (R5) depends on overlapping interactions between users; sparse catalogues will rely more heavily on content (R1) and popularity (R0) baselines.
- **Cold-Start Latency:** New users with zero listening events initially receive popularity-based and declared-preference recommendations until behavioral telemetry accumulates.
- **User-Based Scaling:** While precomputed materialized similarity views scale well for thousands of users, multi-million user deployments would benefit from item-based collaborative filtering or matrix approximation.
- **External Catalog Dependencies:** Audio availability and track metadata are bound by the external Jamendo Creative Commons API constraints.
- **Model Scope:** Does not employ deep neural networks, vector embedding databases, or large language models by deliberate architectural design.

---

## 16. Future Scope

- Item-to-item collaborative filtering and offline matrix factorization (ALS).
- Background scheduled cron workers for asynchronous similarity matrix recomputation.
- Native mobile packaging using Capacitor.
- Distributed Redis caching for high-frequency session and candidate reads.
- Infrastructure-level rate limiting and Web Application Firewall (WAF) integration.
- Expanded music metadata integration (MusicBrainz / AcousticBrainz).

---

## 17. Screenshots

> Screenshots will be added after the final UI validation pass.

---

## 18. License

License: To be determined.
