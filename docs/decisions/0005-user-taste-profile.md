# ADR 0005: Dynamic User Taste Profile & Preference Intelligence

## Status
Accepted

## Context
In Stage 5, TuneSense began capturing raw user interaction logs (`ListeningEvent`). However, raw event streams cannot be queried directly in real time by future recommendation algorithms without incurring prohibitive computational latency and high database read overhead. Furthermore, user taste is non-static; individuals have persistent broad preferences ("long-term taste") alongside shifting seasonal or temporal inclinations ("recent taste").

TuneSense requires a dedicated preference intelligence layer that continuously compiles raw telemetry into a compact, explainable, and deterministic profile representation.

---

## Decisions

### 1. Dedicated `UserTasteProfile` Collection as a Materialized View
- **Decision:** Store computed profiles in a dedicated `UserTasteProfile` collection linked 1-to-1 to `User._id`.
  - **Materialized View Pattern:** The profile document serves as a cached, materialized summary of listening history, allowing future recommendation engines to read a user's full musical affinity profile in a single $O(1)$ document read.
  - **Decoupled Collections:** Raw `ListeningEvent` logs are **never embedded** inside `UserTasteProfile` or `User`. This preserves NoSQL document size limits and keeps the telemetry stream independently scalable and queryable.

### 2. Dual-Layer Architecture: Long-Term vs. Recent Taste
- **Decision:** Segment affinity vectors into two parallel layers:
  - **`longTerm`:** Aggregates the user's historical listening profile across their broader activity window.
  - **`recent`:** Aggregates listening events within a sliding 30-day window (`recentWindowDays = 30`).
- **Trend Detection:** Compute dynamic genre trajectory:
  $$\Delta = \text{recentScore} - \text{longTermScore}$$
  - $\Delta > +0.05$: Classed as `'rising'`
  - $\Delta < -0.05$: Classed as `'declining'`
  - Otherwise: Classed as `'stable'`

### 3. Asymmetric Behavioural Event Weighting
- **Decision:** Weight listening events according to their implicit feedback signal:
  - `complete` (+1.00): Strongest positive confirmation that the user appreciated the track.
  - `play` (+0.10 to +0.50): Scaled positively by completion ratio:
    $$W_{\text{play}} = 0.10 + 0.40 \times \left(\frac{\text{position}}{\text{duration}}\right)$$
  - `pause` (+0.05): Neutral/weak engagement indicator.
  - `skip` (-0.75): Strong negative signal indicating disinterest or mood mismatch.
- **Rationale:** All weights are centralized in `server/src/config/tasteProfileConfig.ts` to allow easy tuning for future research evaluations.

### 4. Exponential Recency Decay
- **Decision:** Attenuate historical signals using continuous exponential decay:
  $$\text{recencyFactor} = e^{-\lambda \times \text{ageInDays}}$$
  with $\lambda = 0.05$ (half-life of approximately 13.86 days).
- **Rationale:** Exponential decay provides smooth, mathematically explainable temporal decay without arbitrary bucket drop-offs.

### 5. Multi-Genre & Acoustic Dimension Normalization
- **Decision:**
  - Multi-genre tracks (e.g., `['electronic', 'ambient']`) distribute their weighted signal equally to each tag.
  - Scores within a category are normalized by dividing by the maximum score, ensuring all affinity vectors scale neatly within $[0, 1]$.
  - Acoustic feature preferences (`energy`, `danceability`, `valence`, `tempo`, `acousticness`, `instrumentalness`) are computed as engagement-weighted averages across tracks containing metadata.

### 6. Cold-Start Handling & Explainable Profile Confidence
- **Decision:**
  - Users with 0 listening events receive a valid empty profile with `profileConfidence = 0.0`.
  - Profile confidence is calculated deterministically across three evidence dimensions:
    $$\text{confidence} = 0.4 \times \min\left(1, \frac{N}{50}\right) + 0.4 \times \min\left(1, \frac{\text{uniqueSongs}}{20}\right) + 0.2 \times \min\left(1, \frac{\text{completeCount}}{10}\right)$$
  - Prevents premature over-fitting on sparse signals while providing an explicit metric for future hybrid recommendation fallbacks.

### 7. Explicit vs. Behavioural Preferences
- **Decision:**
  - `UserPreference`: What the user explicitly tells the system they like (favorite genres, artists).
  - `UserTasteProfile`: What the user's actual behavior demonstrates they enjoy.
  - Future recommendation algorithms will combine both signals.

---

## Consequences
- Every user's evolving taste is compactly summarized and indexed in MongoDB by `userId`.
- Eliminates expensive event-log table scans during recommendation calculations.
- No recommendation generation, song scoring, or ranking logic is introduced in Stage 6.
