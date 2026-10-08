# ADR 0001: Architecture Foundation & Technology Selection

## Status
Accepted

## Context
TuneSense is an academic and production-oriented personalized music discovery platform titled:
*TuneSense: A Personalized, Context-Aware and Explainable Music Recommendation System Using NoSQL*.

The application requires a scalable, maintainable, and decoupled foundation capable of supporting context-aware, mood-aware, and explainable recommendations while maintaining mobile ergonomics and responsive streaming experiences.

---

## Decisions

### 1. Frontend: React + Vite + TypeScript
- **Rationale:**
  - Vite offers instant cold starts and extremely rapid Hot Module Replacement (HMR) powered by native ES modules in development and Rollup in production.
  - React's component-driven model enables isolated UI primitives, reusable card layouts, and modular navigation shells.
  - Strict TypeScript eliminates entire classes of runtime errors across route transitions, API payload handling, and domain modeling.

### 2. Backend: Node.js + Express + TypeScript
- **Rationale:**
  - Express is a battle-tested, lightweight HTTP server framework with a rich ecosystem of middleware (CORS, error handling, rate limiting).
  - A unified TypeScript language boundary between client and server simplifies shared types and interfaces across API boundaries.
  - Asynchronous event-loop architecture in Node.js handles I/O-intensive workloads (streaming metadata queries, recommendation scoring requests) with low overhead.

### 3. Database: MongoDB Atlas (Document Store via Mongoose)
- **Rationale:**
  - Music discovery and listening interactions generate flexible, semi-structured behavioral data (variable context vectors, dynamic mood tags, polymorphic listening logs, and explainability factors).
  - NoSQL document orientation natively represents nested playlist structures and user preference weights without costly relational joins.
  - Mongoose provides strict schema validation, type definitions, and middleware hooks for behavioral tracking events.

### 4. Mobile-First Paradigm
- **Rationale:**
  - Over 70% of digital music consumption occurs on mobile devices.
  - Designing mobile-first ensures touch targets meet or exceed accessibility standards (≥44px), layouts avoid horizontal scrolling on small displays (360px–412px), and bottom navigation remains ergonomically accessible for thumb interactions.
  - Desktop scaling is handled via centered responsive containers rather than squeezing overloaded desktop layouts into mobile frames.

### 5. Decoupled MusicProvider Abstraction
- **Rationale:**
  - Music licensing and catalog availability evolve over time. Initially using Jamendo for legal discovery, the system must support future providers (e.g., Spotify, custom storage) without breaking client contracts or recommendation pipelines.
  - An `IMusicProvider` interface encapsulates catalog querying, metadata normalization, and audio streaming URLs.

### 6. Separation of Recommendation Logic from Music Provider
- **Rationale:**
  - The core intellectual property and research value of TuneSense resides in its context-aware, mood-aware, and explainable recommendation algorithms.
  - Recommendation calculations operate strictly on canonical domain models (track vector representations, user preference logs, context conditions) rather than third-party API payloads.
  - This decoupling allows recommendation models to be tested, benchmarked, and tuned independently of third-party network latencies or rate limits.

---

## Consequences
- Requires strict adherence to interface contracts and service layers.
- Direct database calls from the client or provider coupling in recommendation modules are strictly prohibited.
- Clean development milestones ensure foundation stability before complex features are added.
