# ADR 0007: Personalization, Mood-Aware Input, and User Controls

## Status
Accepted

## Date
2026-10-08

## Context and Problem Statement
In Stages 1–7, TuneSense established an explainable hybrid recommendation engine ($R_4$) synthesizing catalogue popularity ($R_0$), content-taste alignment ($R_1$), inferred behavioural patterns ($R_2$), and temporal context ($R_3$). However, recommendation engines often suffer from two major limitations:
1. **Cold-start latency:** New or low-activity listeners lack sufficient telemetry in `ListeningEvent` to generate high-confidence behavioural recommendations.
2. **Current state blindness:** Long-term historical listening habits do not account for immediate, transient listening intentions or current emotional vibes (e.g., studying vs. working out vs. relaxing).

We needed an explicit personalization architecture that allows users to declare their tastes, set negative preferences (dislikes), regulate exploration/diversity boundaries, and select a real-time mood vibe without destroying the integrity of their inferred behavioural taste models.

## Architectural Decision

### 1. Separation of Concerns: Explicit Preferences vs. Inferred Taste
A fundamental academic and engineering distinction is maintained in TuneSense's NoSQL design:
- **`UserPreference` (Explicit Choices):** Persistent, user-declared preferences stored in a dedicated document with a 1:1 relationship with `User`. Stores preferred genres, preferred artists, preferred languages, disliked genres, disliked artists, default mood, and user-controlled exploration/diversity settings.
- **`UserTasteProfile` (Inferred Behavioural Taste):** A materialized, dynamically computed analytical view aggregated from append-only `ListeningEvent` logs. Users cannot directly manipulate weights in this document.
- **Current Mood (Transient Session Input):** An ephemeral input passed via request parameters (`?mood=...`) or temporary session storage. It directly modulates real-time recommendation scoring weights without mutating the long-term taste profile or fabricating fake listening events.

### 2. Controlled Mood Taxonomy
To maintain explainability, determinism, and prevent premature complexity, TuneSense establishes a controlled 8-mood taxonomy in `server/src/config/moodConfig.ts`:
- **Happy:** High valence ($0.85$), medium-high energy ($0.75$), high danceability ($0.70$), tempo $\approx 120$ BPM.
- **Energetic:** High energy ($0.90$), high valence ($0.75$), high danceability ($0.85$), tempo $\approx 130$ BPM.
- **Relaxed:** Low energy ($0.30$), moderate valence ($0.55$), low danceability ($0.40$), tempo $\approx 85$ BPM, high acousticness ($0.70$).
- **Focused:** Moderate energy ($0.50$), moderate valence ($0.45$), tempo $\approx 105$ BPM, high instrumentalness ($0.65$).
- **Romantic:** Moderate energy ($0.48$), high valence ($0.70$), moderate tempo ($95$ BPM), moderate acousticness ($0.45$).
- **Sad (Reflective):** Low valence ($0.20$), low-moderate energy ($0.32$), low danceability ($0.30$), tempo $\approx 80$ BPM.
- **Calm:** Low energy ($0.22$), moderate valence ($0.50$), tempo $\approx 75$ BPM, high acousticness ($0.80$), instrumentalness ($0.50$).
- **Nostalgic:** Moderate energy ($0.52$), moderate valence ($0.55$), tempo $\approx 96$ BPM, moderate acousticness ($0.50$).

### 3. Mood Scoring Formula
For any candidate track $c$ with acoustic metadata and an active mood target profile $M$:
$$
\text{moodScore}(c, M) = \frac{\sum_{k} w_k \cdot (1 - |\text{feature}_k(c) - \text{target}_k(M)|)}{\sum_{k} w_k}
$$
Where:
- Primary emotional features (energy, valence) receive weight $w_k = 1.5$.
- Secondary musical features (danceability, tempo, acousticness, instrumentalness) receive weight $w_k = 1.0$.
- Clamped strictly to $[0, 1]$. If acoustic metadata is absent, a neutral score of $0.50$ is returned without fabricating certainty.

### 4. Dynamic Hybrid Adaptation with Mood ($R_4$)
When no mood is active, the Stage 7 baseline weights apply:
$$
w_{\text{content}} = 0.35 \cdot C, \quad w_{\text{behaviour}} = 0.30 \cdot C, \quad w_{\text{context}} = 0.20 \cdot C, \quad w_{\text{popularity}} = 0.15 + (1 - C) \cdot 0.85
$$
When a mood is actively selected:
$$
w_{\text{content}} = 0.30 \cdot C, \quad w_{\text{behaviour}} = 0.25 \cdot C, \quad w_{\text{context}} = 0.15 \cdot C, \quad w_{\text{mood}} = 0.15,
$$
$$
w_{\text{popularity}} = 0.15 + (1 - C) \cdot (0.30 + 0.25 + 0.15)
$$
Where $C \in [0, 1]$ is the profile confidence score. This preserves cold-start safety: on zero confidence, mood remains active ($w_{\text{mood}} = 0.15$) and popularity absorbs the unconfident behavioural weights.

### 5. Negative Preferences (Strong Dislike Filtering)
When a user explicitly adds a genre or artist to `dislikedGenres` or `dislikedArtists`:
1. **Candidate Generation:** Filtered at candidate generation time from MongoDB and external provider queries.
2. **Strategy Scoring:** If a candidate slips through (e.g. offline fallback), `HybridStrategy` identifies it via `RecommendationScorer.isDisliked()` and penalizes its total score to $0.01$, suppressing it to the bottom and resetting positive explanation signals.

### 6. User Exploration and Diversity Controls
User preferences include embedded `personalizationSettings`:
- `explorationLevel` $\in [0, 1]$: Modulates novelty exploration slots in recommendation post-processing (up to $30\%$ of recommendations allocated to high-novelty, unplayed candidates).
- `diversityLevel` $\in [0, 1]$: Dynamically modulates maximum songs permitted per artist (1 song for high diversity, 2 for balanced, 3 for focused).

### 7. Explainability
`RecommendationExplainer` prioritizes the mood signal when active and highly aligned ($s_{\text{mood}} \ge 0.65$), generating transparent explanations such as:
- *"Fits your energetic mood and your usual electronic taste"*
- *"Picked for your relaxed mood"*

## Academic NoSQL Schema Architecture
- **1-to-1 User Isolation:** `UserPreference` maintains a unique index on `userId` (`{ userId: 1 }, { unique: true }`), ensuring zero IDOR vulnerabilities and O(1) retrieval.
- **Document Flexibility:** Arrays of preferences (`preferredGenres`, `dislikedGenres`, etc.) leverage MongoDB's document model without requiring join tables.
- **Append-Only Immutability:** `ListeningEvent` remains strictly immutable and append-only. User dislikes or temporary mood changes never mutate historical telemetry.

## Trade-offs and Consequences
- **Deterministic Heuristics vs. ML Inference:** Mood alignment uses interpretable distance functions rather than neural embeddings. This guarantees determinism, zero vector database dependencies, and sub-millisecond execution.
- **Explicit vs. Implicit Mood:** The user must explicitly tap a mood pill or configure a default. No biometric or voice sentiment analysis is attempted, preserving privacy and simplicity.

## Future Considerations (Later Stages)
- Advanced matrix factorization or collaborative filtering in Stage 9+ for crowd-scale discovery.
- Offline model evaluation and metric benchmarking.
