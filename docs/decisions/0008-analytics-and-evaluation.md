# ADR 0008: Analytics, Recommendation Evaluation, and Offline Experimentation

## Status
Accepted

## Date
2026-10-08

## Context and Problem Statement
In Stages 1–8, TuneSense created an explainable hybrid recommendation engine with explicit user personalization and real-time mood adaptation. However, an academic recommendation platform requires rigorous measurement, telemetry aggregation, and offline evaluation capabilities to answer:
1. How are listeners interacting with TuneSense?
2. Which songs, artists, and genres capture genuine engagement?
3. How much of recommended music is actually consumed versus skipped?
4. How do baselines ($R_0$ Popularity, $R_1$ Content, $R_2$ Behaviour, $R_3$ Context) compare with $R_4$ Hybrid?
5. Does mood-aware recommendation improve perceived relevance?
6. Does explainability increase user trust?
7. How does the system behave for cold-start users?

Crucially, in academic recommendation research, **metrics and experimental results must never be fabricated**. Where sufficient real listening data does not yet exist, the system must report `insufficient_data` rather than inventing deceptive scores. Furthermore, offline evaluation must prevent future data leakage through temporal partitioning rather than random data splitting.

---

## Architectural Decision

### 1. Analytics & Telemetry Layer Architecture
A clean separation of concerns is maintained between operational listening telemetry and recommendation exposure:

```
[Client Interaction]
   ├── Audio Playback ──────────────► POST /api/listening-events ───► ListeningEvent (MongoDB)
   └── Rec Exposure (Made For You) ──► POST /api/analytics/impressions ─► RecommendationImpression (MongoDB)
                                                                           │
                                  ┌────────────────────────────────────────┘
                                  ▼
                     [MongoDB Aggregation Pipelines]
                     ($match, $group, $facet, $lookup, $unwind)
                                  │
                                  ▼
                          AnalyticsService
                                  │
                                  ├── GET /api/analytics/me (User-level listening stats)
                                  └── GET /api/analytics/recommendations (Conversion & CTR)
                                  │
                                  ▼
                             Analytics UI
```

1. **`ListeningEvent` Collection (Operational Telemetry):**
   The source of truth for all playback behavior (`play`, `pause`, `skip`, `complete`). Extended with optional attribution metadata:
   - `recommendationRequestId`: UUID connecting a playback to an exposure batch.
   - `recommendationStrategy`: Strategy variant ($R_0$–$R_4$) that produced the recommendation.
   - `recommendationPosition`: Rank index (1-indexed) in the recommended carousel.
   Backward-compatible and sparse-indexed.

2. **`RecommendationImpression` Collection (Exposure Tracking):**
   Tracks recommendation cards shown to users without corrupting playback telemetry:
   - `userId`, `songId`, `strategy`, `recommendationScore`, `position`, `mood`, `sessionId`, `recommendationRequestId`, `generatedAt`.
   Compound index: `{ userId: 1, generatedAt: -1 }`, `{ recommendationRequestId: 1 }`.

3. **`EvaluationFeedback` Collection (Subjective Perception):**
   Dedicated collection storing 1–5 Likert scale subjective ratings for:
   - **Mood relevance:** Did the recommendation match the desired emotional state?
   - **Explanation helpfulness & trust:** Did the explanation rationale improve confidence in the system?

---

### 2. Operational Metrics Definitions

All operational metrics are computed server-side via MongoDB aggregation pipelines without loading historical event logs into Node memory:

| Metric | Mathematical Definition | Interpretation |
| :--- | :--- | :--- |
| **Completion Rate** | $\frac{\text{Completed Plays}}{\text{Total Plays}}$ | Fraction of started songs listened to completion ($\ge 95\%$). |
| **Skip Rate** | $\frac{\text{Skipped Plays}}{\text{Total Plays}}$ | Fraction of started tracks abandoned prematurely ($< 95\%$). |
| **Play-Through Rate (CTR)** | $\frac{\text{Recommendation Plays}}{\text{Recommendation Impressions}}$ | Recommendation conversion / exposure engagement rate. |
| **Avg Completion %** | $\frac{1}{N} \sum_{i=1}^N \min(100, \frac{\text{position}_i}{\text{duration}_i} \times 100)$ | Mean progression across playback events. |
| **Listening Minutes** | $\frac{\sum_{i=1}^N \text{durationSeconds}_i}{60}$ | Total consumed audio playback duration in minutes. |
| **Average Position Before Play** | $\frac{1}{K} \sum_{j=1}^K \text{recommendationPosition}_j$ | Average display rank of items chosen for playback. |

---

### 3. Offline Recommendation Evaluation Framework

#### A. Temporal Train/Test Split (Zero Future Leakage)
Random train/test splitting introduces severe **future data leakage** in sequential music listening: training on Monday and Wednesday to predict Tuesday leaks subsequent taste evolution.

TuneSense enforces a strict temporal split:
$$
T_{\text{split}} = T_{\text{current}} - \text{testDays} \times 86400000\,\text{ms}
$$
- **Training Period:** All `ListeningEvent` records with $\text{timestamp} < T_{\text{split}}$.
- **Test Period:** All `ListeningEvent` records with $\text{timestamp} \ge T_{\text{split}}$.
- **Minimum Thresholds:** Users must possess at least $3$ historical training events and at least $1$ held-out test event. Users below this threshold are categorized as cold-start and evaluated separately.

#### B. Relevance Definition
A recommended track $c$ in recommendation list $R$ is strictly defined as **relevant** if and only if the user actually listened to track $c$ in their held-out test period:
$$
\text{relevant}(c) = \begin{cases} 1 & \text{if } c \in \text{TestSongs}(u) \\ 0 & \text{otherwise} \end{cases}
$$

#### C. Evaluation Metrics Formulary

1. **Precision@K:**
   $$
   \text{Precision@K}(u) = \frac{|\text{TopK}(u) \cap \text{TestSongs}(u)|}{K}
   $$

2. **Recall@K:**
   $$
   \text{Recall@K}(u) = \frac{|\text{TopK}(u) \cap \text{TestSongs}(u)|}{|\text{TestSongs}(u)|}
   $$

3. **HitRate@K:**
   $$
   \text{HitRate@K}(u) = \begin{cases} 1 & \text{if } |\text{TopK}(u) \cap \text{TestSongs}(u)| > 0 \\ 0 & \text{otherwise} \end{cases}
   $$

4. **Normalized Discounted Cumulative Gain (NDCG@K):**
   $$
   \text{DCG@K} = \sum_{i=1}^K \frac{\text{rel}_i}{\log_2(i + 1)}, \quad \text{IDCG@K} = \sum_{i=1}^{\min(K, |\text{TestSongs}|)} \frac{1}{\log_2(i + 1)}
   $$
   $$
   \text{NDCG@K} = \frac{\text{DCG@K}}{\text{IDCG@K}} \quad (\text{if IDCG} = 0, \text{NDCG} = 0)
   $$

5. **Intra-List Diversity (ILD):**
   Measures pairwise dissimilarity within the recommended list using content and acoustic attributes:
   $$
   \text{ILD}(R) = \frac{2}{|R|(|R| - 1)} \sum_{i=1}^{|R|} \sum_{j=i+1}^{|R|} \text{dissimilarity}(s_i, s_j)
   $$
   Where $\text{dissimilarity} = 1 - \text{pairwiseSim}(s_i, s_j)$, incorporating Jaccard genre overlap ($0.40$), artist identity ($0.30$), energy distance ($0.15$), and valence distance ($0.15$).

6. **Catalog Coverage:**
   $$
   \text{Coverage} = \frac{|\bigcup_{u} \text{TopK}(u)|}{|\text{Catalogue}|}
   $$
   Demonstrates whether a strategy personalizes across the catalogue or repeatedly recommends the same top items.

7. **Novelty@K:**
   Measures discovery of unfamilar tracks based on user exposure history:
   $$
   \text{Novelty@K}(u) = \frac{1}{K} \sum_{i=1}^K \max\left(0, 1 - \frac{\text{playCount}(s_i, u)}{\text{threshold}}\right)
   $$

---

### 4. Strategy Comparison & Ablation Studies

The framework provides multi-strategy benchmarking ($R_0$–$R_4$) and ablation configurations:
- **$R_0$ (Popularity Baseline):** Catalogue popularity scores only.
- **$R_1$ (Content Personalization):** Acoustic & genre taste alignment only.
- **$R_2$ (Behavioural Personalization):** Recent taste shifts and repeat listens.
- **$R_3$ (Contextual Personalization):** Time-of-day and day-of-week contextual relevance.
- **$R_4$ (Full TuneSense Hybrid):** Full linear combination with profile confidence scaling.
- **Ablation: No Mood:** Hybrid without mood modifier ($w_{\text{mood}} = 0$).
- **Ablation: No Context:** Hybrid without temporal context modifier ($w_{\text{context}} = 0$).
- **Ablation: No Behaviour:** Content + Context + Popularity.

### 5. Strict Academic Integrity Rule (Zero Data Fabrication)
If a user or dataset does not possess the minimum training and test events required for valid offline evaluation:
```json
{
  "strategy": "hybrid",
  "usersEvaluated": 0,
  "k": 10,
  "precisionAtK": 0,
  "recallAtK": 0,
  "hitRateAtK": 0,
  "ndcgAtK": 0,
  "diversity": 0,
  "novelty": 0,
  "catalogCoverage": 0,
  "insufficientData": true,
  "message": "Evaluation requires additional listening data with at least 3 historical training events and held-out test events."
}
```
**No estimated, synthetic, or imaginary Precision/Recall figures are presented as genuine analytics.**

---

### 6. NoSQL & MongoDB Architectural Considerations
1. **Append-Only Telemetry:** `ListeningEvent` documents are never mutated after insertion, ensuring immutable audit trails.
2. **$facet Aggregation:** The user listening analytics pipeline executes a single MongoDB aggregation query with `$facet` to calculate total counts, distribution buckets, and date histograms in one database round-trip.
3. **Compound Indexes:**
   - `{ userId: 1, timestamp: -1 }` on `ListeningEvent`
   - `{ 'metadata.recommendationRequestId': 1 }` (sparse) on `ListeningEvent`
   - `{ userId: 1, generatedAt: -1 }` on `RecommendationImpression`
   - `{ recommendationRequestId: 1 }` on `RecommendationImpression`
4. **Server-Side Execution:** Aggregation happens directly within MongoDB engine, avoiding transporting thousands of raw events over the wire into Node.js memory.

---

## Consequences

### Positive
- Production listening behavior is measured accurately without impacting playback performance.
- True recommendation conversion (exposure $\rightarrow$ click $\rightarrow$ completion) is measurable via lightweight impressions.
- The offline evaluation framework operates with complete mathematical reproducibility and zero data leakage.
- Subjective feedback provides ground truth for mood and explanation perception.
- The mobile-first UI provides clear insights into personal listening telemetry and academic strategy benchmarks.

### Limitations
- In early stages before high volume listening, offline Precision and Recall will correctly report `insufficient_data`.
- Pairwise Intra-List Diversity (ILD) is $O(K^2)$ per recommended list, which is lightweight for $K=10$ (45 pairs) but would require sampling for large $K \ge 100$.
