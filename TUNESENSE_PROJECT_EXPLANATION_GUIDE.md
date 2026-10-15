# 🎵 TuneSense: Comprehensive Academic & Viva Presentation Guide
**A Personalized, Context-Aware, and Explainable Music Recommendation System Using NoSQL**

---

## 📌 Document Overview & Purpose
This guide is an all-in-one technical reference for **TuneSense**. It explains the system from fundamental design choices up to mathematical formulas and production hardening. You can read, print, or convert this Markdown file directly into a PDF report to prepare for teacher evaluations, project vivas, and technical defense sessions.

---

# 📑 Table of Contents
1. [Executive Summary & High-Level Pitch](#1-executive-summary--high-level-pitch)
2. [Problem Statement & Academic Motivation](#2-problem-statement--academic-motivation)
3. [System Architecture & Technology Stack](#3-system-architecture--technology-stack)
4. [NoSQL Data Engineering & Materialized Views](#4-nosql-data-engineering--materialized-views)
5. [The 6-Tier Recommendation Hierarchy (R0–R5)](#5-the-6-tier-recommendation-hierarchy-r0r5)
6. [Unique Core Innovations](#6-unique-core-innovations)
   - 6.1 [Emotional GPS (Russell's Circumplex Trajectories)](#61-emotional-gps)
   - 6.2 [Photo-to-Music (Visual-Acoustic Multimodal Mapping)](#62-photo-to-music)
   - 6.3 [Explainable AI (XAI) & Counterfactual Analysis](#63-explainable-ai--counterfactual-analysis)
7. [Scientific Offline Evaluation Framework](#7-scientific-offline-evaluation-framework)
8. [Application Security & Production Hardening](#8-application-security--production-hardening)
9. [Codebase Directory Structure](#9-codebase-directory-structure)
10. [Top 15 Teacher / Viva Questions with Model Answers](#10-top-15-teacher--viva-questions-with-model-answers)
11. [Live Demonstration Script (Step-by-Step)](#11-live-demonstration-script)

---

# 1. Executive Summary & High-Level Pitch

### The 30-Second Viva Opening
> *"Good morning, respected evaluators. I am presenting **TuneSense**, a personalized, context-aware, and explainable music streaming and recommendation platform. Unlike commercial platforms like Spotify that act as opaque 'black boxes' and suffer from relational database query bottlenecks, TuneSense provides human-readable explanations and counterfactual 'what-if' simulations for every recommendation. It features a 6-tier recommendation hierarchy (R0–R5), an Emotional GPS that navigates emotional transitions along mathematical coordinates, an image-to-music vibe extractor, and an append-only NoSQL architecture with precomputed materialized views delivering sub-100ms response times."*

---

# 2. Problem Statement & Academic Motivation

Traditional commercial recommenders suffer from three major systemic flaws:

1. **The "Black-Box" Problem:** 
   Traditional deep learning and matrix factorization recommenders do not explain *why* a song was suggested. Users cannot tell if a track appeared due to global popularity, recent listening, or marketing bias, creating algorithmic mistrust.
2. **Context Blindness:** 
   Standard recommenders assume static preferences. A listener wanting ambient music for a Monday morning study session is frequently served high-energy weekend party tracks because the engine ignores diurnal and weekly rhythms.
3. **The Relational SQL Bottleneck:** 
   In high-throughput music streaming, telemetry events (`play`, `pause`, `skip`, `seek`, `complete`) arrive at high frequencies. In a relational database (PostgreSQL/MySQL), computing real-time user-user cosine similarities or recency-decayed taste profiles requires multi-table `JOIN` operations across millions of rows, causing high latency and database locking.

---

# 3. System Architecture & Technology Stack

```
   ┌────────────────────────────────────────────────────────┐
   │             React 18 SPA (Vite + TailwindCSS)          │
   │  Dual layout (Desktop Sidebar + Mobile AppShell)       │
   │  Persistent HTML5 Audio Engine & Telemetry Emitters    │
   └───────────────────────────┬────────────────────────────┘
                               │ HTTP / REST (JWT in HttpOnly Cookies)
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │               Node.js + Express REST API               │
   │      Strict TypeScript 5.7 & Zod Schema Validation     │
   └───────────┬───────────────────────┬────────────────────┘
               │                       │
   ┌───────────┴────────────┐  ┌───────┴───────────────┐  ┌───────────────────┐
   │   Auth & Security      │  │ Recommendation Engine │  │ Music Catalogue   │
   │  • Bcrypt (12 rounds)  │  │  • Candidate Gen      │  │  • Jamendo API    │
   │  • Side-channel defense│  │  • R0–R5 Scorers      │  │  • MP3 Streaming  │
   │  • Token-Bucket Limiter│  │  • XAI Explainer      │  │  • Offline Cache  │
   └────────────────────────┘  └───────────┬───────────┘  └───────────────────┘
                                           │
                                           ▼
                                ┌───────────────────────────────────────┐
                                │         MongoDB Atlas (NoSQL)         │
                                │  • Append-Only Telemetry Logs         │
                                │  • Precomputed Materialized Views     │
                                │  • Compound Indexed Domain Models     │
                                └───────────────────────────────────────┘
```

### Complete Technology Stack:
- **Client:** React 18.3, TypeScript 5.7, Vite 6.1, TailwindCSS 3.4, React Router v6, Lucide Icons.
- **Server:** Node.js v20+, Express 4.21, TypeScript executed natively via `tsx`.
- **Validation:** Zod 3.24 (strict payload sanitization against NoSQL injection).
- **Authentication:** Signed JWTs stored in `HttpOnly`, `SameSite` cookies with `bcryptjs` (cost factor 12).
- **Database:** MongoDB Atlas with Mongoose 9.11 ODM.
- **Audio Provider:** Jamendo REST API v3.0 (Creative Commons license audio streaming) with offline fallback catalog.

---

# 4. NoSQL Data Engineering & Materialized Views

TuneSense separates the **write path** (telemetry ingestion) from the **read path** (recommendation generation):

```
ListeningEvent (Append-Only Write Path)
  │
  ├──► [Exponential Decay Aggregator] ──► UserTasteProfile (Materialized View: O(1) Read)
  │
  └──► [Sparse Co-Occurrence Pipeline] ──► UserSimilarity (Cosine Matrix: O(1) Read)
```

### The 13 Mongoose Domain Collections:
1. `User`: Account identity, credentials, role, lockout counters.
2. `UserPreference`: Explicit preferences (genres, artists, mood toggles, diversity slider).
3. `Song`: Track metadata, MP3 stream URL, and 10-dimensional acoustic feature vector.
4. `Artist`: Artist entity, image URL, biography, genres.
5. `Album`: Album metadata, artwork, release dates.
6. `ListeningEvent`: High-volume append-only telemetry stream (`play`, `pause`, `skip`, `complete`, dwell time, context).
7. `UserTasteProfile`: **Materialized View** storing dual-layer preferences (long-term vs. 30-day exponential decay).
8. `UserSongInteraction`: Sparse interaction matrix with implicit interaction weights.
9. `UserSimilarity`: **Materialized View** of pairwise user cosine similarities.
10. `UserLibrary`: Liked songs and bookmarked albums (updated atomically via `$addToSet` and `$pull`).
11. `Playlist`: User-created playlists with track ordering and capacity limits ($\le 500$).
12. `RecommendationImpression`: Slate exposure logs for Click-Through Rate (CTR) and conversion analytics.
13. `CounterfactualExperimentLog`: Audit logs storing "what-if" simulations and sensitivity analyses.

### The Normalized Acoustic Feature Space:
Every song in TuneSense has a normalized acoustic vector in $[0.0, 1.0]$:
- **Valence ($[0, 1]$):** Musical positiveness and happiness.
- **Energy ($[0, 1]$):** Perceived intensity and dynamic activity.
- **Danceability ($[0, 1]$):** Rhythmic stability and beat strength.
- **Acousticness ($[0, 1]$):** Likelihood the track is acoustic rather than synthesized.
- **Tempo ($[0, 1]$):** Normalized tempo mapped from $[40, 220\text{ BPM}]$.
- **Loudness, Speechiness, Instrumentalness, Liveness.**

---

# 5. The 6-Tier Recommendation Hierarchy (R0–R5)

The recommendation engine follows a 4-step pipeline:
`Candidates Generation ➔ Hard Filters ➔ Strategy Scoring ➔ Diversity Post-Processing`

### Step 1: Candidate Generation (`CandidateGenerator.ts`)
Harvests candidates from user top genres, favorite artists, collaborative neighbor libraries, and catalog trends.

### Step 2: Hard Filters
1. **Deduplication:** Filters out redundant track IDs.
2. **Cool-Off Filter:** Withholds tracks completed within the last **2 hours** to eliminate immediate repetition.
3. **Disliked Suppression:** Drops any track matching user-disliked artists or genres (`score = 0.01`).

### Step 3: Strategy Scoring (R0–R5)

#### R0: Popularity Baseline (`PopularityStrategy.ts`)
- **Target:** Cold-start listeners with zero history.
- **Formula:**
  $$\text{score}_{\text{pop}} = \frac{\log(1 + \text{plays})}{\log(1 + \text{maxPlays})}$$

#### R1: Content Personalization (`ContentStrategy.ts`)
- **Target:** Users with explicit onboarding preferences.
- **Formula:**
  $$\text{score}_{\text{content}} = 0.35 \cdot S_{\text{genre}} + 0.25 \cdot S_{\text{artist}} + 0.30 \cdot (1 - d_{\text{acoustic}}) + 0.10 \cdot S_{\text{lang}}$$
  *(where $d_{\text{acoustic}}$ is the Euclidean distance between the song's vector and the user's taste vector).*

#### R2: Behavioral Recency Decay (`BehaviourStrategy.ts`)
- **Target:** Tracking shifting musical taste over time.
- **Mechanism:** Applies **exponential half-life decay**:
  $$w_i = e^{-\lambda \cdot \Delta t} \quad (\lambda = 0.05 \implies \text{half-life} \approx 13.8\text{ days})$$
  Recent listening habits contribute 40% while long-term history contributes 60%. Genres flagged as `rising` receive an affinity boost.

#### R3: Temporal Context-Awareness (`ContextStrategy.ts`)
- **Target:** Aligning recommendations with daily routines.
- **Dimensions:**
  - `timeOfDay`: Morning (05:00–11:59), Afternoon (12:00–16:59), Evening (17:00–21:59), Late Night (22:00–04:59).
  - `dayOfWeek`: Monday through Sunday.
- Compares candidate energy and valence against the user's historical engagement during that specific time block.

#### R4: Hybrid Strategy + Mood Blending (`HybridStrategy.ts`)
- **Target:** Main personal home feed.
- **Formula:**
  $$\text{score}_{\text{hybrid}} = w_c S_{\text{content}} + w_b S_{\text{behaviour}} + w_x S_{\text{context}} + w_p S_{\text{popularity}} + \text{MoodBonus} + \text{NoveltyBonus}$$
- **Dynamic Confidence Redistribution:** If profile confidence is low ($< 0.25$, cold start), personal weights proportionally downscale and unallocated weight is absorbed by popularity, ensuring suggestions remain accurate without guessing.

#### R5: Collaborative Hybrid (`CollaborativeHybridStrategy.ts`)
- **Target:** Communal, serendipitous discovery.
- **Mechanism:** Computes **Cosine Similarity** over sparse implicit user-song interaction matrices:
  $$\text{sim}(u, v) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|} = \frac{\sum_{s} r_{u,s} \cdot r_{v,s}}{\sqrt{\sum_{s} r_{u,s}^2} \cdot \sqrt{\sum_{s} r_{v,s}^2}}$$
  *(Implicit event weights: Complete = +1.0, Play = +0.1, Pause = +0.05, Skip = -0.75).*

### Step 4: Diversity & Novelty Post-Processing
- **Artist Cap:** Maximum 2 tracks per artist (controlled by user `diversityLevel` slider).
- **Album Cap:** Maximum 2 tracks per album.
- **Novelty Reserve:** 10%–30% of slate is reserved for unfamiliar songs with high novelty scores ($1 - \min(1, \text{plays}/5)$).

---

# 6. Unique Core Innovations

### 6.1 Emotional GPS (`EmotionalGpsPage.tsx`)
- **Theoretical Basis:** **Russell's Circumplex Model of Affect**, which maps emotional states onto a 2D plane: **Valence** (pleasure/displeasure) and **Arousal/Energy** (activation/deactivation).
- **The Problem:** Sudden jumps between contrasting moods (e.g., from *Stressed* [Valence 0.25, Energy 0.85] directly to *Calm* [Valence 0.60, Energy 0.20]) create cognitive dissonance.
- **The Solution:** The Emotional GPS algorithm computes $N$ interpolated transition waypoints:
  $$\mathbf{W}_k = \mathbf{M}_{\text{start}} + \frac{k}{N} (\mathbf{M}_{\text{target}} - \mathbf{M}_{\text{start}})$$
  For each waypoint $k$, the pathfinder queries candidate tracks minimizing Euclidean distance to $\mathbf{W}_k$, smoothly guiding the user's emotional state over the duration of the playlist.

### 6.2 Photo-to-Music (`PhotoMusicPage.tsx`)
- **Multimodal Vibe Extraction:** Translates visual features into acoustic coordinates:
  - **Image Brightness $\rightarrow$ Acoustic Energy:** Bright images map to energetic, dynamic rhythms.
  - **Color Warmth $\rightarrow$ Musical Valence:** Warm hues (oranges, yellows) map to positive, happy tracks; cooler hues (blues, greys) map to melancholic tones.
  - **Color Saturation $\rightarrow$ Danceability:** High saturation maps to rhythmic, groovy beats.
- Uses nearest-neighbor Euclidean distance in acoustic space to assemble a curated soundtrack matching the photo's atmosphere.

### 6.3 Explainable AI (XAI) & Counterfactuals (`CounterfactualEngine.ts`)
- **Human-Readable Explanations:** Every recommended track provides a clear, natural-language explanation:
  - *"Matches your taste in Synthwave and Electronic"*
  - *"Listeners with tastes similar to yours enjoyed this"*
  - *"Fits your usual relaxed evening listening"*
- **Quantitative Score Breakdown:** Surfaces component scores (Content: 91%, Behavioral: 84%, Context: 73%, Collaborative: 82%).
- **Counterfactual "What-If" Analysis:**
  - Simulates how algorithmic decisions change under counterfactual actions (e.g., *"If you had skipped track A, track B would have moved to rank #1"*).
  - Determines the minimal preference recourse required for a song to enter the top 5.

---

# 7. Scientific Offline Evaluation Framework

Located in `server/src/services/analytics/EvaluationService.ts` and visible on the `/analytics` dashboard:

### 1. Leakage-Free Chronological Partitioning ($T_{\text{split}}$)
To prevent **future-data leakage**, the evaluation suite partitions telemetry data chronologically:
$$T_{\text{split}} = T_{\text{now}} - \text{testDays}$$
- Models train strictly on interactions occurring *before* $T_{\text{split}}$.
- Predictions are evaluated against actual interactions occurring *after* $T_{\text{split}}$.
- **No Data Fabrication:** If a user does not have enough events for both train and test splits, the system raises an `insufficientData: true` flag instead of inventing scores.

### 2. Academic Metrics Evaluated:
1. **Precision@K (K=5, 10):** Ratio of recommended songs the user actually played/completed in the test window.
2. **Recall@K (K=5, 10):** Ratio of total test-window interactions that were captured in top $K$.
3. **HitRate@K (K=5, 10):** Binary metric indicating if at least one relevant song appeared in top $K$.
4. **NDCG@K (Normalized Discounted Cumulative Gain):** Evaluates ranking quality by assigning higher weights to relevant items at top ranks:
   $$\text{DCG}@K = \sum_{i=1}^{K} \frac{2^{\text{rel}_i} - 1}{\log_2(i + 1)}, \quad \text{NDCG}@K = \frac{\text{DCG}@K}{\text{IDCG}@K}$$
5. **Intra-List Diversity (ILD):** Mean pairwise acoustic distance across recommended songs:
   $$\text{ILD} = \frac{2}{K(K-1)} \sum_{i=1}^{K} \sum_{j=i+1}^{K} d_{\text{acoustic}}(s_i, s_j)$$
6. **Novelty@K:** Inverse catalog popularity score rewarding unexpected discoveries over mainstream hits.

---

# 8. Application Security & Production Hardening

- **Password Hashing:** Salted hashes via `bcryptjs` with cost factor **12** and a **72-character ceiling** (mitigating bcrypt silent truncation).
- **Timing Side-Channel Protection:** Executes a dummy constant-time bcrypt hash calculation when an unknown email attempts login, preventing user enumeration.
- **Session Security:** Cryptographically signed JWTs stored in `HttpOnly`, `SameSite` cookies (`Secure` flag in production).
- **NoSQL Injection Defense:** Strict Zod schema validation strips or rejects dangerous MongoDB operators (`$where`, `$gt`, `$ne`, `$regex`).
- **Rate Limiting:** In-memory token-bucket rate limiter restricting authentication attempts to 60 requests per 15 minutes per IP.
- **IDOR Protection:** All library updates, playlist mutations, and taste profile edits enforce identity matching against the verified session token.

---

# 9. Codebase Directory Structure

```text
TuneSense/
├── client/                               # React 18 Frontend Application
│   ├── src/
│   │   ├── components/                   # UI Primitives, Layout, Music Cards, Modals
│   │   │   ├── auth/                     # Auth forms & ProtectedRoute
│   │   │   ├── layout/                   # AppShell, DesktopSidebar, TopNav, MiniPlayer
│   │   │   ├── music/                    # SongCard, AudioPlayer, QueueDrawer
│   │   │   ├── recommendation/           # RecommendationCard, ExplainabilityBadge
│   │   │   └── ui/                       # Button, Modal, Slider, Tabs, Badges
│   │   ├── contexts/                     # AudioPlayerContext, AuthContext, AppConfigContext
│   │   ├── pages/                        # 18 React page components
│   │   ├── routes/                       # AppRoutes.tsx routing definitions
│   │   ├── services/                     # Typed API clients (Axios/Fetch)
│   │   └── types/                        # TypeScript interfaces for API payloads
│   ├── tailwind.config.js                # Custom Midnight Obsidian color tokens
│   └── vite.config.ts                    # Vite build configuration & API proxy
│
├── server/                               # Express REST API Server
│   ├── src/
│   │   ├── config/                       # Database connection, env schemas, mood configs
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
│   │   │       ├── CounterfactualEngine.ts
│   │   │       ├── JourneyRecommendationService.ts (Emotional GPS)
│   │   │       ├── VibeRecommendationService.ts    (Photo-to-Music)
│   │   │       ├── RecommendationEngine.ts
│   │   │       ├── RecommendationExplainer.ts
│   │   │       └── RecommendationScorer.ts
│   │   ├── utils/                        # Verification suites & seedDemoData.ts
│   │   └── validators/                   # Zod payload schemas
│   └── tsconfig.json
│
├── package.json                          # Monorepo orchestration scripts
└── README.md                             # Repository documentation
```

---

# 10. Top 15 Teacher / Viva Questions with Model Answers

### Q1: What makes TuneSense different from Spotify or Apple Music?
> **Model Answer:** *"Commercial systems are opaque black boxes that optimize primarily for user retention and global virality. TuneSense prioritizes Explainable AI (XAI), providing transparent rationales and counterfactual simulations for every recommendation. It also introduces continuous mood navigation via Emotional GPS and multimodal visual vibe extraction, all running on an append-only NoSQL architecture that avoids expensive relational joins."*

### Q2: Why did you choose MongoDB over a relational database like PostgreSQL?
> **Model Answer:** *"Music streaming generates a high-velocity stream of telemetry events. In SQL, computing real-time user-user cosine similarities and recency-decayed taste profiles requires multi-table joins across millions of records. MongoDB allows us to append raw telemetry rapidly without locking tables, while aggregating data into precomputed materialized views (`UserTasteProfile`, `UserSimilarity`) for O(1) index-backed reads under 100ms."*

### Q3: How do you solve the cold-start problem for a newly registered user?
> **Model Answer:** *"We solve cold start in two phases: First, during onboarding, the user selects preferred genres and artists, which immediately seeds an initial preference profile. Second, in strategy R4, our Dynamic Confidence Redistribution calculates profile confidence ($c \in [0, 1]$). If $c < 0.25$, personal weights scale down and unallocated weight is absorbed by R0 Popularity Baseline, shifting toward personalization as the user logs plays."*

### Q4: Explain the mathematics behind strategy R2 (Behavioral Recency).
> **Model Answer:** *"R2 balances 60% long-term history with 40% short-term listening using exponential half-life decay: $w_i = e^{-\lambda \cdot \Delta t}$, where $\lambda = 0.05$. This corresponds to a half-life of approximately 13.8 days. Interactions from yesterday carry significantly more weight than interactions from a month ago, allowing the system to adapt quickly to shifting user tastes."*

### Q5: How does R5 Collaborative Filtering work without leaking peer user privacy?
> **Model Answer:** *"We compute Cosine Similarity over sparse implicit interaction vectors where completed plays add +1.0 and skips deduct -0.75. To protect privacy, peer user IDs, names, and emails are never returned to the frontend. The user only receives an aggregated label: 'Listeners with tastes similar to yours enjoyed this'."*

### Q6: What is Russell's Circumplex Model, and how is it used in Emotional GPS?
> **Model Answer:** *"Russell's Circumplex Model is a psychological framework that maps emotions onto a 2D coordinate system of Valence (pleasure vs. displeasure) and Arousal/Energy (activation vs. deactivation). In Emotional GPS, instead of making a jarring leap from 'Stressed' to 'Calm', the engine calculates intermediate waypoints along this 2D plane and selects tracks near each waypoint to guide the listener smoothly toward their target emotional state."*

### Q7: How does Photo-to-Music extract acoustic features from an image?
> **Model Answer:** *"We extract visual attributes from the image and map them directly into acoustic coordinates: Image brightness maps to acoustic Energy; color warmth (hue) maps to musical Valence; and color saturation maps to Danceability. We then perform nearest-neighbor Euclidean distance matching against our catalog's acoustic vectors."*

### Q8: What is Counterfactual Reasoning in Explainable AI?
> **Model Answer:** *"Counterfactual explanations answer 'what-if' questions. Rather than simply explaining why a song was chosen, our Counterfactual Engine calculates the minimal change in user behavior needed to change the outcome—for example: 'If you had played 2 more Ambient tracks yesterday, Track X would have ranked #1'."*

### Q9: How does the offline evaluation framework prevent future-data leakage?
> **Model Answer:** *"We use strict chronological partitioning ($T_{\text{split}} = T_{\text{now}} - \text{testDays}$). The recommendation engine is trained exclusively on telemetry logged before $T_{\text{split}}$, and predictions are tested strictly against interactions recorded after $T_{\text{split}}$. If a user has insufficient data on either side of $T_{\text{split}}$, an explicit flag is returned instead of fabricating metrics."*

### Q10: What metrics do you evaluate in the analytics dashboard?
> **Model Answer:** *"We evaluate Precision@K and Recall@K for retrieval accuracy, HitRate@K for success rate, NDCG@K for ranking quality, Intra-List Diversity (ILD) for acoustic spread, and Novelty@K to ensure we are not simply surfacing global hits."*

### Q11: How do you prevent filter bubbles or recommendation echo chambers?
> **Model Answer:** *"We enforce three safeguards: (1) A 2-hour cool-off filter on recently completed tracks, (2) An artist and album cap limiting tracks per artist to 2, and (3) A novelty reserve slot dedicating up to 30% of the recommendation slate to unfamiliar, high-novelty tracks."*

### Q12: Where does the music audio come from, and is it legal?
> **Model Answer:** *"All audio streaming is powered by the Jamendo REST API, which provides legal, Creative Commons-licensed music. For testing and offline mode, the backend includes deterministic fallback audio files with full acoustic vectors."*

### Q13: How do you prevent timing side-channel attacks during authentication?
> **Model Answer:** *"When a login attempt is made with an email that does not exist in our database, the server runs a dummy constant-time bcrypt hash calculation. This ensures the response time is identical whether an email exists or not, preventing attackers from enumerating valid user emails based on server response latency."*

### Q14: How does the persistent audio player work across page route transitions?
> **Model Answer:** *"The HTML5 `<audio>` element is mounted at the root level inside a React Context (`AudioPlayerContext`). When the user navigates between pages via React Router, the page body re-renders, but the root audio provider and audio element remain mounted and uninterrupted."*

### Q15: How are telemetry events dispatched during song playback?
> **Model Answer:** *"The persistent player monitors audio events: It emits a `play` event on start, `pause` on pause, `skip` if skipped before 80% duration, and `complete` once playback crosses 80%. Each event includes dwell time and the active `recommendationRequestId` to enable closed-loop conversion analytics."*

---

# 11. Live Demonstration Script

Follow this sequence during your live presentation:

1. **Homepage ([http://localhost:5173/](http://localhost:5173/)):**
   - Point out **Trending** and **Curated Soundscapes**.
   - Click **Play** on any track to demonstrate the persistent audio player.
   - Explain: *"Every play, seek, and skip triggers background telemetry into our MongoDB `ListeningEvent` collection."*
2. **Recommendations Page ([`/recommendations`](http://localhost:5173/recommendations)):**
   - Switch between **R0 (Popularity)**, **R1 (Content)**, **R3 (Context)**, and **R4 (Hybrid)** in the dropdown.
   - Click on the **Explainability Badge** on any card to show the human-readable rationale (*"Why this track?"*) and the percentage component breakdown.
3. **Emotional GPS ([`/emotional-gps`](http://localhost:5173/emotional-gps)):**
   - Select Initial Mood = **Stressed** and Target Mood = **Calm**.
   - Click **Generate Transition Route**.
   - Show the intermediate waypoints and explain: *"This interpolates valence and energy along Russell's Circumplex plane to smooth the emotional transition."*
4. **Photo-to-Music ([`/photo-music`](http://localhost:5173/photo-music)):**
   - Upload or select a demo image.
   - Show how visual brightness, warmth, and saturation map to energy, valence, and danceability.
5. **Analytics Dashboard ([`/analytics`](http://localhost:5173/analytics)):**
   - Show the offline evaluation charts displaying NDCG@10, Precision@K, and Intra-List Diversity (ILD).
   - Emphasize: *"These metrics are computed using strict $T_{\text{split}}$ temporal partitioning with zero future-data leakage."*
