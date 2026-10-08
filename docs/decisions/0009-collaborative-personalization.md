# ADR 0009: Explainable User-Based Collaborative Personalization Layer (Stage 10)

## Status
Accepted

## Date
2026-10-08

## Context and Problem Statement
In Stages 1–9, TuneSense established an explainable hybrid recommendation engine integrating explicit preferences ($R_1$), user behavioral taste profiles ($R_2$), context awareness ($R_3$), and real-time mood adaptation ($R_4$). While content, behavior, context, and mood provide strong individual signals, they miss the communal discovery power of collaborative filtering—uncovering songs that listeners with similar musical tastes enjoy.

The objective of Stage 10 is to add an **explainable collaborative personalization layer** ($R_5$) to TuneSense while adhering strictly to academic NoSQL principles, transparency, privacy, and zero future data leakage during evaluation.

---

## Architectural Decision

### 1. Fundamental Design Choice: Classical User-Based Collaborative Filtering
Per explicit architectural decision, TuneSense **strictly avoids**:
- Neural collaborative filtering (NCF)
- Matrix factorization (SVD / ALS)
- Vector databases (Pinecone, Milvus, Qdrant)
- High-dimensional dense embeddings / Deep learning models

**Justification for Classical User-Based CF:**
1. **Explainability & Trust:** User-based CF produces transparent, deterministic rationales ("*Listeners with tastes similar to yours enjoyed this*") directly verifiable against user listening overlap.
2. **Viva Defense & Academic Transparency:** Classical vector geometry (cosine similarity over sparse interaction vectors) is straightforward to evaluate, verify mathematically, and explain in academic defense.
3. **NoSQL / MongoDB Native Compatibility:** Sparse interaction sets can be aggregated and indexed using MongoDB document operators (`$match`, `$group`, `$lookup`, `$project`) without requiring an external machine learning offline training pipeline or GPU infrastructure.
4. **Data Sovereignty & Privacy:** By decoupling private identity from aggregate neighborhood scoring, recommendations remain completely explainable without exposing personally identifiable information (PII).

---

### 2. Conceptual Pipeline Architecture

```
User
  ↓
ListeningEvent (Raw Telemetry)
  ↓
UserSongInteraction (Sparse Derived Collection)
  ↓
Similar-User Discovery (Cosine Similarity over overlapping interactions)
  ↓
UserSimilarity (Materialized Cache)
  ↓
Collaborative Candidate Generation
  ↓
Hybrid Recommendation Engine (R5 Dynamic Confidence Blending)
  ↓
Explainable Recommendation Card ("Listeners with tastes similar to yours enjoyed this")
```

---

### 3. Collaborative Interaction Strength Model

Interaction scores for each `(userId, songId)` pair are derived deterministically from existing `ListeningEvent` telemetry using consistent behavioral event weights:
- `complete`: **+1.00** (Full track engagement)
- `play`: **+0.10** (Optionally scaled by completion percentage: $0.10 + 0.40 \times \frac{\text{percent}}{100}$)
- `pause`: **+0.05** (Dwell intention)
- `skip`: **-0.75** (Negative signal / disinterest)

The composite interaction score is clamped within bounds $[-1.0, 10.0]$:
$$\text{interactionScore}(u, s) = \max\left(-1.0, \min\left(10.0, \sum w_e \times \text{count}_e\right)\right)$$

Tracks with $\text{score} \ge 0.20$ are classified as **positively engaged**, while tracks with $\text{score} \ge 1.50$ are deemed **heavily consumed**.

---

### 4. Sparse Representation vs. Dense Matrix

Dense user-item matrices in relational systems suffer from severe sparsity and catastrophic storage blowup ($|U| \times |S|$). MongoDB's document model is natively suited for a sparse representation:

#### `UserSongInteraction` Collection:
```typescript
{
  userId: ObjectId,
  songId: ObjectId,
  interactionScore: Number,
  playCount: Number,
  completionCount: Number,
  skipCount: Number,
  lastInteractionAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes:**
- Compound unique index: `{ userId: 1, songId: 1 }` (guarantees exactly one sparse record per user-song pair)
- Track engagement index: `{ songId: 1, interactionScore: -1 }` (fast neighbor lookup for songs)
- User engagement index: `{ userId: 1, interactionScore: -1 }` (fast extraction of top engaged songs)
- Recency index: `{ lastInteractionAt: -1 }` (staleness monitoring and temporal maintenance)

---

### 5. Mathematical User Similarity Formula

Pairwise similarity between target user $A$ and candidate neighbor $B$ is calculated using **Cosine Similarity** over their sparse interaction score vectors:

$$\text{similarity}(A, B) = \frac{\sum_{s \in S_A \cap S_B} r_{A,s} \cdot r_{B,s}}{\sqrt{\sum_{s \in S_A} r_{A,s}^2} \cdot \sqrt{\sum_{s \in S_B} r_{B,s}^2}}$$

**Configurable Threshold Constraints:**
- $\text{minimumCommonSongs} = 2$: Users with $<2$ overlapping songs receive similarity $0$.
- $\text{minimumSimilarity} = 0.10$: Weak correlations below $0.10$ are discarded.
- $\text{maximumSimilarUsers} = 20$: Candidate neighbors are ranked descending by similarity and capped at top 20.

#### `UserSimilarity` Materialized Cache Collection:
```typescript
{
  userId: ObjectId,
  similarUserId: ObjectId,
  similarity: Number,     // [0, 1]
  commonSongs: Number,    // >= 2
  calculatedAt: Date,
  profileVersion: Number
}
```
**Indexes:**
- Compound unique: `{ userId: 1, similarUserId: 1 }`
- Neighborhood rank: `{ userId: 1, similarity: -1 }`
- Cache invalidation: `{ calculatedAt: -1 }`

---

### 6. Candidate Generation & Popularity Bias Mitigation

1. **Neighbor Harvesting:** Retrieve tracks positively engaged by similar neighbors ($r_{B,s} \ge 0.20$).
2. **Consumption Filtering:** Discard songs target user $A$ has already heavily consumed ($r_{A,s} \ge 1.50$) or completed within the recent cooloff window.
3. **Safety Filtering:** Strictly filter out candidate tracks matching user $A$'s explicitly disliked genres or artists.
4. **Collaborative Scoring:**
   $$\text{rawScore}(s) = \sum_{u \in \text{similarUsers}} \text{similarity}(A, u) \times r_{u, s}$$
   Supporting user bonus: $+0.05$ per supporting neighbor beyond the first (capped at $+0.20$).
5. **Popularity Bias Mitigation (Section 17):**
   Collaborative filtering tends to over-recommend universally popular songs. A mild inverse-popularity dampening factor ($\beta = 0.35$) is applied:
   $$\text{collaborativeScore}(s) = \frac{\text{normalizedScore}(s)}{1.0 + \beta \times \text{globalPopularity}(s)}$$

---

### 7. Collaborative Confidence & Cold Start Fallback Policy

A target user with no or sparse interaction history cannot reliably discover similar neighbors.
- **Cold Start ($0$ interactions):** $\text{collaborativeConfidence} = 0.0$. Collaborative scoring is neutralized, and the engine falls back entirely to content, mood, context, and popularity.
- **Low History ($1$–$2$ interactions):** $\text{collaborativeConfidence} = 0.0$.
- **Established History ($\ge 3$ interactions):**
  $$\text{confidence} = 0.4 \times \min\left(1, \frac{N_{\text{interactions}}}{10}\right) + 0.3 \times \min\left(1, \frac{|\text{neighbors}|}{5}\right) + 0.3 \times \overline{\text{similarity}}$$

---

### 8. $R_5$ Collaborative Hybrid Weight Integration

Stage 10 extends the existing $R_4$ architecture without breaking $R_0$–$R_4$ baselines:

| Signal Component | Baseline Weight | Behavior Under Low Collaborative Confidence |
| :--- | :--- | :--- |
| Content ($R_1$) | 0.25 | Absorbs proportional unallocated collaborative weight |
| Behaviour ($R_2$) | 0.20 | Absorbs proportional unallocated collaborative weight |
| Context ($R_3$) | 0.10 | Absorbs proportional unallocated collaborative weight |
| Mood ($R_4$) | 0.10 | Active when user selects vibe; cold-start invariant |
| Collaborative ($R_5$) | 0.20 | Scaled dynamically by $w_{\text{collab}} = 0.20 \times \text{confidence}$ |
| Popularity ($R_0$) | 0.10 | Absorbs remaining weight when profile confidence is low |
| Novelty | 0.05 | Soft discovery reward |

**Weight Invariant:** $\sum w_i = 1.00$ at all times. Weights are bounded strictly $\ge 0$, and never produce `NaN` or negative values.

---

### 9. Privacy, Anonymization, and Explainability

Explanations use strictly aggregate, privacy-preserving language:
- `"Listeners with tastes similar to yours enjoyed this."`
- `"Popular among listeners who also enjoy your music."`

**Guarantees:**
- No email addresses, display names, or raw user ObjectIds are exposed in recommendation payloads.
- Normal users cannot query other listeners' similarity profiles or interaction matrices.
- Authentication and anti-spoofing IDOR checks remain enforced (`403 Forbidden` on user ID mismatches).

---

### 10. Offline Evaluation with Zero Future Data Leakage

For offline evaluation ($R_0$–$R_5$ comparison):
1. User events are partitioned into training ($\text{timestamp} < T_{\text{split}}$) and test ($\text{timestamp} \ge T_{\text{split}}$) sets.
2. Sparse interaction vectors and user similarity values are calculated **strictly from training events**.
3. Zero test events ever leak into similar user discovery, candidate generation, or ranking.
4. **Collaborative Coverage Metric:**
   $$\text{Collaborative Coverage} = \frac{\text{Number of evaluated users with } \ge 1 \text{ similar neighbor}}{\text{Total evaluated users}}$$
5. No metrics are fabricated: when insufficient data exists, `insufficientData: true` is reported.

---

## Consequences & Academic Limitations

### Positive Consequences
- **Modular Expansion:** $R_5$ is added cleanly as an optional strategy while $R_0$–$R_4$ remain intact for comparison.
- **Explainable Discoveries:** Recommendations provide human-interpretable rationale with zero neural black boxes.
- **Fast Serving via Materialization:** Materialized sparse collections (`UserSongInteraction`, `UserSimilarity`) avoid repeatedly aggregating millions of raw listening events.

### Documented Academic Limitations
1. **Overlap Dependency:** In small prototypes with sparse user populations, interaction overlap may be limited, resulting in lower Collaborative Coverage.
2. **Cold Start:** New users cannot benefit from collaborative personalization until at least 3 distinct positive interactions occur.
3. **Linear Aggregation Scale:** At massive production scale ($10^7$ users), all-pairs cosine similarity requires approximate nearest neighbor indexing or distributed batch pipelines. Classical CF is intentionally chosen here for academic scope, transparency, and explainability.
