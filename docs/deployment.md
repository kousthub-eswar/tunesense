# TuneSense Deployment & Operations Guide

This guide covers local development, testing, and production deployment for **TuneSense**.

---

## 1. Prerequisites

- **Node.js:** v20.x or v22.x LTS (Recommended)
- **Package Manager:** npm v10+
- **Database:** MongoDB Atlas M0 (Free tier) or local MongoDB v7.0+
- **Music Provider:** Free Jamendo Developer API Client ID ([devportal.jamendo.com](https://devportal.jamendo.com/))

---

## 2. Environment Variables Configuration

### 2.1 Server Environment (`server/.env`)

Copy `server/.env.example` to `server/.env`:

```bash
cp server/.env.example server/.env
```

Configure the following variables:

```env
# Server Runtime
PORT=5000
NODE_ENV=development # Set to 'production' in production deployments
CLIENT_ORIGIN=http://localhost:5173
CLIENT_URL=http://localhost:5173

# Database Configuration (MongoDB Atlas)
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/tunesense?retryWrites=true&w=majority
MONGODB_DB_NAME=tunesense

# Music Catalogue Provider (Jamendo)
JAMENDO_CLIENT_ID=<your_jamendo_client_id>

# Authentication Security (JWT)
JWT_SECRET=<generate_a_random_32_character_string>
JWT_EXPIRES_IN=7d
```

> [!IMPORTANT]
> In production (`NODE_ENV=production`), `MONGODB_URI` and `JWT_SECRET` are strictly validated on startup. If missing, the server halts to prevent insecure operation.

### 2.2 Client Environment (`client/.env`)

Copy `client/.env.example` to `client/.env`:

```bash
cp client/.env.example client/.env
```

Configure:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 3. Installation & Local Development

### 3.1 Install All Dependencies
From the repository root:

```bash
npm run install:all
```

### 3.2 Run in Development Mode
Run both frontend and backend concurrently:

```bash
# Terminal 1: Backend API
npm run dev:server

# Terminal 2: Frontend Web Client
npm run dev
```

The application will be accessible at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`
- Health Check: `http://localhost:5000/api/health`

---

## 4. Production Build & Deployment

### 4.1 Build Both Client and Server
From the repository root:

```bash
npm run build
```

This compiles:
1. `client`: Output to `client/dist/` (Vite production bundle).
2. `server`: Output to `server/dist/` (TypeScript compiled to ES modules).

### 4.2 Start Production Server
```bash
cd server
NODE_ENV=production node dist/server.js
```

---

## 5. Demo Data Seeding & Maintenance

### 5.1 Seed Deterministic Demo Dataset
To populate a deterministic dataset showcasing multi-user collaborative filtering (Alice, Bob, Charlie, Dana), songs, and interaction matrices:

```bash
cd server
npm run seed:demo
```

### 5.2 Clean Demo Data
To remove all demo data safely:

```bash
cd server
npm run clean:demo
```

---

## 6. Stage Verification & Regression Testing

Run the comprehensive production verification suite:

```bash
cd server
node dist/utils/verifyStage11.js
```

Run all previous stage verification suites:

```bash
node dist/utils/verifyStage10.js
node dist/utils/verifyStage9.js
node dist/utils/verifyStage8.js
node dist/utils/verifyStage7.js
node dist/utils/verifyStage6.js
node dist/utils/verifyStage5.js
node dist/utils/verifyStage4.js
```

---

## 7. Collaborative Similarity Rebuild Operations

In production, user similarities should be periodically rebuilt via scheduled background cron jobs:

```typescript
import { collaborativeService } from './services/recommendation/CollaborativeService.js';

// Rebuild similarity cache for a specific user
await collaborativeService.rebuildUserSimilarities(userId);

// Nightly cron job to refresh all user similarities
await collaborativeService.rebuildAllSimilarities();
```

---

## 8. Troubleshooting & Diagnostics

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `Running in DEGRADED mode` | `MONGODB_URI` not set or cluster unreachable | Set valid `MONGODB_URI` in `server/.env` and verify MongoDB Atlas IP access list allows connection. |
| `Jamendo API Client ID is not configured` | Missing `JAMENDO_CLIENT_ID` in `server/.env` | Register at [devportal.jamendo.com](https://devportal.jamendo.com/) and paste client ID into `server/.env`. |
| `CORS Error in Browser` | Mismatched `CLIENT_ORIGIN` | Ensure `CLIENT_ORIGIN` in `server/.env` matches the frontend URL (e.g., `http://localhost:5173`). |
| `401 Unauthorized on protected routes` | Cookie missing or token expired | Ensure browser allows cookies from backend domain or use login endpoint. |
