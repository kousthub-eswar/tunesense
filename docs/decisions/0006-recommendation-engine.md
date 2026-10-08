# Decision Record 0006: Recommendation Engine Architecture (R0–R4)

## Context
TuneSense requires a modular, explainable recommendation engine capable of generating personalized song suggestions from user taste profiles, behavioural signals, catalogue metadata, and temporal listening contexts. To support academic evaluation and methodological transparency, the recommendation system must avoid black-box neural networks or unexplainable embeddings and instead implement explicit mathematical scoring layers progressing from non-personalized baselines to full hybrid personalization.

## Decision

### 1. Multi-Tier Strategy Architecture (R0–R4)
The recommendation system is structured as five independent, testable strategies implementing the `IRecommendationStrategy` interface:

1. **R0 — Popularity Baseline (`PopularityStrategy`):**
   - Non-personalized baseline scoring candidates purely on catalogue engagement.
   - Signal: $\text{popularityScore} = \text{positiveEngagement} - \text{skipPenalty}$, normalized to $[0, 1]$.
   - Independent of user preferences, history, or context.

2. **R1 — Content + Taste Personalization (`ContentStrategy`):**
   - Evaluates candidate song attributes against the user's `UserTasteProfile.longTerm`:
     - Genre affinity matching (35% weight)
     - Top artist matching (25% weight)
     - Acoustic feature similarity (30% weight: energy, danceability, valence, acousticness, tempo)
     - Vocal language matching (10% weight)
   - Formula:
     $$\text{score}_{\text{content}} = 0.35 \cdot S_{\text{genre}} + 0.25 \cdot S_{\text{artist}} + 0.30 \cdot S_{\text{audio}} + 0.10 \cdot S_{\text{lang}}$$

3. **R2 — Behavioural Personalization (`BehaviourStrategy`):**
   - Focuses on user actions rather than static tags by blending long-term habits with recent taste:
     - Long-term genre affinity (60% weight)
     - Recent taste window affinity (40% weight)
     - Rising trend reinforcement (bonus for genres marked `rising` in `profile.trends`)
     - Repeat play familiarity adjustment and completion tendency bonuses

4. **R3 — Context-Aware Personalization (`ContextStrategy`):**
   - Modifies candidate relevance based on the user's current environment:
     - `timeOfDay`: morning (05:00–11:59), afternoon (12:00–16:59), evening (17:00–21:59), late_night (22:00–04:59)
     - `dayOfWeek`: Monday through Sunday
     - Energy and acoustic alignment matching cyclical engagement habits

5. **R4 — Full Hybrid TuneSense Recommendation (`HybridStrategy`):**
   - Composite linear combination of all four foundational signals:
     $$\text{score}_{\text{hybrid}} = 0.35 \cdot S_{\text{content}} + 0.30 \cdot S_{\text{behaviour}} + 0.20 \cdot S_{\text{context}} + 0.15 \cdot S_{\text{popularity}} + \text{noveltyBonus}$$
   - **Dynamic Confidence Adaptation:** When `profile.profileConfidence < 0.25` (cold start / low history), personalization weights scale down proportionally while popularity and catalogue exploration scale up to preserve recommendation quality without fabricating preferences.

### 2. Candidate Generation & Bulk Retrieval
To ensure sub-100ms response times without scanning the entire catalogue:
- Queries top user genres, top artists, recent taste genres, and catalogue trending tracks in bulk.
- Enforces recent completion cooloff: tracks completed within the past 2 hours are temporarily withheld to prevent immediate looping.
- Eliminates $N+1$ query overhead by enriching candidates in memory.

### 3. Diversity and Novelty Controls
- **Diversity Constraints:** Greedily restricts recommendations to a maximum of 2 songs per artist (`maxPerArtist: 2`) and 2 songs per album (`maxPerAlbum: 2`).
- **Exploration Reserve:** Automatically reserves 15% of recommendation slots for high-novelty exploration candidates.
- **Novelty Score:** Computed as $1 - \min(1, \text{playCount} / 5)$ to encourage discovering unfamiliar tracks.

### 4. Explainability & Human-Readable Reasons
Every recommendation generates a structured `ExplanationSignal` mapped to user-friendly copy:
- `genre`: *"Because you often listen to {genre} music"*
- `artist`: *"More from {artistName}, an artist you frequently enjoy"*
- `recentTaste`: *"Based on your recent listening to {genre}"*
- `audioFeature`: *"Matches your preference for {high-energy / acoustic} tracks"*
- `context`: *"Fits your {evening / late night} listening pattern"*
- `novelty`: *"Something new to explore based on your taste"*
- `popularity`: *"Popular and trending on TuneSense"*

### 5. Why Collaborative Filtering is Deferred
Collaborative filtering (user-user, item-item, matrix factorization) introduces cold-start sparsity, requires a dense multi-user interaction matrix, and complicates explainability. By establishing transparent content, behavioural, and contextual baselines first, TuneSense creates an explainable foundation against which collaborative models can be rigorously benchmarked in future stages.

## Status
Accepted and verified in Stage 7.
