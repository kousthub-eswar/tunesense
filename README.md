# TuneSense

> **Music that understands your vibe.**

**Academic Title:** *TuneSense: A Personalized, Context-Aware and Explainable Music Recommendation System Using NoSQL*

---

## 1. Project Overview & Stage Status

TuneSense is a production-quality, mobile-first personalized music discovery and recommendation application.

### Current Development Stage: **Stage 3 (Music Provider Abstraction, Jamendo Integration & Audio Streaming)**
This repository is currently at **Stage 3**.

**Scope Boundaries for Stage 3:**
- ✅ Music Provider abstraction (`IMusicProvider`) with `JamendoProvider` integration
- ✅ Server-side credential isolation (`JAMENDO_CLIENT_ID` in `server/.env`)
- ✅ Controlled music catalogue search and retrieval (`/api/music/search`, `/api/music/popular`, `/api/music/tracks/:id`, etc.)
- ✅ Catalogue persistence and deduplication across MongoDB models (`Song`, `Artist`, `Album`)
- ✅ Real browser audio playback foundation using native HTML5 Audio via `AudioPlayerContext`
- ✅ Interactive mobile-first `MiniPlayer` with play/pause, seek scrub bar, time indicators, and volume controls
- ✅ Interactive `SearchPage` with real-time search, filters (All, Tracks, Artists, Albums), and instant play
- ⛔ *Authentication, User Onboarding, Likes/Dislikes, Playlists, and Recommendation algorithms remain deferred to subsequent staged milestones.*

---

## 2. Technology Stack

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite 6
- **Language:** TypeScript 5 (Strict Mode)
- **Styling:** Tailwind CSS (Custom Dark Theme Tokens)
- **Routing:** React Router DOM 6
- **Icons:** Lucide React
- **Design Target:** Mobile-First (360px - 412px, responsive to desktop)

### Backend
- **Runtime:** Node.js (v20+)
- **Framework:** Express 4
- **Language:** TypeScript 5 (Strict Mode)
- **Validation:** Zod
- **Utilities:** CORS, dotenv, tsx

### Database (Planned for Stage 2+)
- **Target:** MongoDB Atlas
- **ODM:** Mongoose (Document-based behavioral and interaction modeling)

---

## 3. Repository Structure

```
tunesense/
│
├── client/                     # Mobile-First Frontend Application
│   ├── public/                 # Static assets & SVG favicon
│   ├── src/
│   │   ├── assets/             # Brand logos & graphics
│   │   ├── components/
│   │   │   ├── ui/             # Reusable primitives (Button, Card, Badge, Input, Avatar, etc.)
│   │   │   ├── layout/         # Shell layouts (AppShell, MobileHeader, BottomNavigation, etc.)
│   │   │   ├── music/          # Music primitives (SongCard, ArtistCard, AlbumCard, MiniPlayer)
│   │   │   └── recommendation/ # Recommendation components (RecommendationCard, Reason, Section)
│   │   ├── constants/          # Navigation items, design tokens, mock fixtures
│   │   ├── contexts/           # AppConfigContext (React Context API)
│   │   ├── hooks/              # Custom hooks (useHealthCheck)
│   │   ├── pages/              # View pages (HomePage, DiscoverPage, LibraryPage, ProfilePage, etc.)
│   │   ├── routes/             # Centralized routing hierarchy (AppRoutes.tsx)
│   │   ├── services/           # Strongly typed API client services
│   │   ├── types/              # Domain interfaces and TypeScript contracts
│   │   ├── utils/              # ClassName helper utilities
│   │   ├── App.tsx             # Root React App component
│   │   ├── index.css           # Design tokens, CSS variables, base styles
│   │   └── main.tsx            # React DOM mounting entrypoint
│   ├── .env.example            # Client environment template
│   ├── package.json            # Client dependencies and build scripts
│   ├── tailwind.config.js      # Tailwind design system palette and radii
│   ├── tsconfig.json           # Client strict TypeScript configuration
│   └── vite.config.ts          # Vite build config
│
├── server/                     # Express API Server
│   ├── src/
│   │   ├── config/             # Environment validation with Zod
│   │   ├── controllers/        # Health check controller
│   │   ├── middleware/         # Centralized error handler and 404 handler
│   │   ├── models/             # (Placeholder for future Mongoose models)
│   │   ├── providers/          # (Placeholder for future IMusicProvider implementations)
│   │   ├── recommendation/     # (Placeholder for future recommendation algorithms)
│   │   ├── routes/             # API routers (/api/health)
│   │   ├── services/           # (Placeholder for business logic services)
│   │   ├── types/              # Express response and API error interfaces
│   │   ├── utils/              # Shared server utility helpers
│   │   ├── validators/         # Zod request query/body schemas
│   │   ├── app.ts              # Express application assembly & CORS config
│   │   └── server.ts           # Server bootstrap and graceful shutdown
│   ├── .env.example            # Server environment template
│   ├── package.json            # Server dependencies and build scripts
│   └── tsconfig.json           # Server strict TypeScript configuration
│
├── docs/                       # Architecture & Technical Documentation
│   ├── architecture/
│   │   └── overview.md         # System boundaries, data flow, and layers
│   ├── database/
│   │   └── schema-notes.md     # MongoDB NoSQL collection design & rationale
│   ├── api/
│   │   └── api-overview.md     # API contract documentation & endpoint specs
│   └── decisions/
│       └── 0001-architecture-foundation.md # Architecture Decision Record (ADR 0001)
│
├── .gitignore                  # Git ignore rules for node_modules, builds, and secrets
├── package.json                # Monorepo orchestration scripts
└── README.md                   # This project guide
```

---

## 4. Environment Variables

Templates are provided in `.env.example` files:

### Client (`client/.env.example`)
```bash
VITE_API_BASE_URL=http://localhost:5000/api
```

### Server (`server/.env.example`)
```bash
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Future Stage Variables (Architectural references)
# MONGODB_URI=
# JWT_SECRET=
# JAMENDO_CLIENT_ID=
```

---

## 5. Getting Started & Commands

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### 1. Install Dependencies
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Run Backend in Development Mode
```bash
cd server
npm run dev
```
The server will start at `http://localhost:5000`.  
Verify health check:
```bash
curl http://localhost:5000/api/health
```
Expected response:
```json
{
  "status": "ok",
  "service": "tunesense-api",
  "timestamp": "2026-10-08T05:33:38.721Z",
  "environment": "development"
}
```

### 3. Run Frontend in Development Mode
```bash
cd client
npm run dev
```
The client Vite dev server will start at `http://localhost:5173`.

### 4. Build for Production
```bash
# Build server (TypeScript compilation via tsc)
cd server
npm run build

# Build client (TypeScript check + Vite production bundle)
cd ../client
npm run build
```
