# TuneSense: Live Launch & Smoke Test Checklist

## 1. Overview

This document provides the exact operational checklist for connecting **TuneSense** to live cloud services (**MongoDB Atlas**, **Jamendo API**) and validating the complete production application flow.

---

## 2. Environment Variables Specification

| Variable | Location | Required | Secret | Description |
|:---|:---|:---:|:---:|:---|
| `MONGODB_URI` | Backend | **Yes** | **Yes** | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | Backend | **Yes** | No | Database name (e.g. `tunesense`) |
| `JAMENDO_CLIENT_ID` | Backend | **Yes** | Sensitive | Jamendo API Client ID |
| `JWT_SECRET` | Backend | **Yes** | **Yes** | Session signing secret (min 32 characters) |
| `JWT_EXPIRES_IN` | Backend | **Yes** | No | Session duration (e.g. `7d`) |
| `NODE_ENV` | Backend | **Yes** | No | Runtime mode (`production` or `development`) |
| `PORT` | Backend | **Yes** | No | HTTP port (e.g. `5000` or assigned by cloud host) |
| `CLIENT_ORIGIN` | Backend | **Yes** | No | Allowed CORS origin (e.g. `https://tunesense.vercel.app`) |
| `VITE_API_BASE_URL` | Frontend | **Yes** | No | Backend API endpoint (e.g. `https://tunesense-api.onrender.com/api`) |

---

## 3. Cloud Services Configuration Guide

### A. MongoDB Atlas
1. Create or log in to a MongoDB Atlas account at [cloud.mongodb.com](https://cloud.mongodb.com/).
2. Deploy a cluster (e.g. M0 Sandbox or Dedicated).
3. Under **Database Access**, create a user with read/write privileges on the `tunesense` database.
4. Under **Network Access**, allow access from the production hosting provider's IP range or `0.0.0.0/0` (secured with strong credentials).
5. Copy the connection string:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/tunesense?retryWrites=true&w=majority
   MONGODB_DB_NAME=tunesense
   ```
6. Paste these into your backend environment settings (e.g. Render/Railway dashboard or `server/.env`). **Never commit this URI to Git.**

### B. Jamendo Developer Portal
1. Register for an account at [devportal.jamendo.com](https://devportal.jamendo.com/).
2. Create an Application (e.g. *TuneSense*).
3. Copy your assigned **Client ID**.
4. Set in backend environment:
   ```env
   JAMENDO_CLIENT_ID=your_jamendo_client_id_here
   ```
5. Note: Keep this client ID strictly on the backend; do not expose it in the client bundle.

### C. JWT Authentication Secret
1. Generate a cryptographically secure random string (at least 32 characters):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Configure in backend environment:
   ```env
   JWT_SECRET=your_generated_random_secret_string
   JWT_EXPIRES_IN=7d
   ```

### D. Frontend API URL
1. Set the production backend URL in `client/.env` or Vercel Environment Variables:
   ```env
   VITE_API_BASE_URL=https://your-backend-service.onrender.com/api
   ```

---

## 4. Final Live Smoke Test Protocol (37 Steps)

Once credentials and deployment URLs are configured, execute the following 37-step smoke test and record the outcome:

| # | Step Name | Expected Behavior | Status |
|:---:|:---|:---|:---:|
| 1 | **Backend health** | `GET /api/health` returns HTTP 200 with `status: ok` and `database: connected` | `[PASS / FAIL / SKIPPED]` |
| 2 | **MongoDB connection** | Database successfully handshakes and indexes initialize without errors | `[PASS / FAIL / SKIPPED]` |
| 3 | **Jamendo search** | `GET /api/music/search?q=electronic` returns live Jamendo tracks | `[PASS / FAIL / SKIPPED]` |
| 4 | **Signup** | Register a new user at `/signup`; receives valid auth session | `[PASS / FAIL / SKIPPED]` |
| 5 | **Login** | Log in at `/login` with credentials; receives `httpOnly` cookie | `[PASS / FAIL / SKIPPED]` |
| 6 | **Session persistence** | Hard reload page (`Ctrl+F5`); user remains logged in | `[PASS / FAIL / SKIPPED]` |
| 7 | **Home dashboard** | Displays dynamic greeting, personalized sections, or popularity fallback | `[PASS / FAIL / SKIPPED]` |
| 8 | **Search catalogue** | Query tracks in `/search`; live cards render with artwork and metadata | `[PASS / FAIL / SKIPPED]` |
| 9 | **Play real track** | Clicking play on a track starts audio streaming via HTML5 Audio | `[PASS / FAIL / SKIPPED]` |
| 10 | **Pause / resume** | Playback pauses and resumes seamlessly from existing timestamp | `[PASS / FAIL / SKIPPED]` |
| 11 | **Next / previous** | Next advances queue; previous restarts if >3s or goes back | `[PASS / FAIL / SKIPPED]` |
| 12 | **Queue management** | Queue drawer displays upcoming songs; tracks can be removed | `[PASS / FAIL / SKIPPED]` |
| 13 | **Shuffle** | Shuffles remaining tracks while keeping the currently playing track | `[PASS / FAIL / SKIPPED]` |
| 14 | **Repeat** | Cycles between `off`, `one` (repeats current track), and `all` | `[PASS / FAIL / SKIPPED]` |
| 15 | **Listening event telemetry** | Playback logs `play`, `complete`, or `skip` events to `ListeningEvent` collection | `[PASS / FAIL / SKIPPED]` |
| 16 | **Taste profile rebuild** | `POST /api/profile/taste/rebuild` updates `UserTasteProfile` from events | `[PASS / FAIL / SKIPPED]` |
| 17 | **R0 recommendation** | Popularity baseline returns top catalog tracks | `[PASS / FAIL / SKIPPED]` |
| 18 | **R1 recommendation** | Content personalization matches user's preferred genres/artists | `[PASS / FAIL / SKIPPED]` |
| 19 | **R2 recommendation** | Behavioural layer reflects recent listening shifts and repeat affinity | `[PASS / FAIL / SKIPPED]` |
| 20 | **R3 recommendation** | Context layer adjusts candidate scores based on time of day | `[PASS / FAIL / SKIPPED]` |
| 21 | **R4 recommendation** | Hybrid strategy ranks candidates with mood bonusing | `[PASS / FAIL / SKIPPED]` |
| 22 | **R5 recommendation** | Collaborative hybrid recommends tracks from similar listeners | `[PASS / FAIL / SKIPPED]` |
| 23 | **Like track** | Clicking heart adds track to user's liked list; heart turns violet | `[PASS / FAIL / SKIPPED]` |
| 24 | **Unlike track** | Clicking filled heart removes track from liked list atomically | `[PASS / FAIL / SKIPPED]` |
| 25 | **Listening history** | `/library` displays real recently played tracks from `ListeningEvent` | `[PASS / FAIL / SKIPPED]` |
| 26 | **Create playlist** | User creates a new playlist via modal; appears in library | `[PASS / FAIL / SKIPPED]` |
| 27 | **Add song to playlist** | Adding track from modal populates playlist `songIds` via `$addToSet` | `[PASS / FAIL / SKIPPED]` |
| 28 | **Remove song from playlist** | Removing song updates playlist track list cleanly via `$pull` | `[PASS / FAIL / SKIPPED]` |
| 29 | **Rename playlist** | Editing playlist title/description persists updates to MongoDB | `[PASS / FAIL / SKIPPED]` |
| 30 | **Delete playlist** | Deleting playlist removes document and refreshes library view | `[PASS / FAIL / SKIPPED]` |
| 31 | **Logout** | Logging out clears session cookie; redirects to guest state | `[PASS / FAIL / SKIPPED]` |
| 32 | **Login again** | Re-authenticating restores previous user session and taste profile | `[PASS / FAIL / SKIPPED]` |
| 33 | **Verify data persistence** | Liked songs and playlists remain intact across sessions | `[PASS / FAIL / SKIPPED]` |
| 34 | **Test mobile viewports** | Test at 360px, 375px, 390px, 412px; no horizontal scroll, >=44px touch targets | `[PASS / FAIL / SKIPPED]` |
| 35 | **Production SPA routes** | Direct navigation to `/library`, `/search`, `/playlist/:id` works (Vercel rewrite) | `[PASS / FAIL / SKIPPED]` |
| 36 | **Backend error handling** | Bad requests return structured JSON `{ error: { message } }` without stack traces | `[PASS / FAIL / SKIPPED]` |
| 37 | **Verify no secrets exposed** | DevTools Network & Sources tabs verify 0 secret keys leaked to frontend | `[PASS / FAIL / SKIPPED]` |
