# ADR 0003: User Authentication, Identity & Session Management

## Status
Accepted

## Context
TuneSense requires an authentication system to identify individual users, establish authenticated sessions, protect private backend routes, and bind user profiles to their listening preferences (`UserPreference`). The authentication architecture must be secure, mobile-friendly, and maintain complete isolation between client storage and sensitive cryptographic tokens.

---

## Decisions

### 1. JWT-Based Identity with Minimal Claims
- **Decision:** Use signed JSON Web Tokens (JWT) containing minimal payload:
  ```json
  {
    "sub": "<userId>",
    "iat": 1728364800,
    "exp": 1728969600
  }
  ```
- **Rationale:** Stateless tokens enable fast verification in Express middleware without querying the database for every protected read. Keeping the token payload minimal (`sub` only) prevents accidental exposure of user emails, roles, or internal attributes if the payload is decoded.

### 2. HTTP-Only Cookie Storage Over LocalStorage
- **Decision:** Tokens are transported and stored exclusively via an HTTP-only cookie named `tunesense_token`:
  - `httpOnly: true`: Inaccessible to browser JavaScript, mitigating Cross-Site Scripting (XSS) token theft.
  - `secure: config.isProduction`: Transmitted strictly over HTTPS in production.
  - `sameSite: 'lax'`: Provides CSRF mitigation while allowing top-level navigation.
  - `path: '/'`: Accessible across all API endpoints.
  - `maxAge: 7 days`: Matches token expiration window.
- **Rationale:** Storing authentication tokens in `localStorage` or `sessionStorage` exposes sensitive credentials to malicious scripts. The HTTP-only cookie approach ensures that client code interacts only with safe user representations (`SafeUserDto`) and never directly handles raw JWT strings.

### 3. Password Hashing with `bcryptjs`
- **Decision:** Passwords are never stored in plaintext or weak hashes. They are hashed using `bcryptjs` with a work factor (salt rounds) of 12 before being saved into the `passwordHash` field of the `User` document.
- **Rationale:** A work factor of 12 provides a robust balance between computational defense against brute-force attacks and server throughput during registration and login.

### 4. Reusable Authentication Middleware (`requireAuth`)
- **Decision:** Route protection is encapsulated in `requireAuth` middleware:
  - Extracts token from `req.cookies.tunesense_token` (with Bearer Authorization header fallback for automated testing and tools).
  - Verifies token signature with `JWT_SECRET`.
  - Attaches authenticated identity to `req.user = { id: payload.sub }` using strict TypeScript express declarations (`Express.Request.user`).
  - Returns clean `401 Unauthorized` without leaking internal errors.
- **Rationale:** Eliminates repeated token verification logic across individual route handlers and enforces consistent authorization checks.

### 5. Session Lifecycle & Logout Behavior
- **Decision:**
  - Login/Signup sets the `tunesense_token` cookie.
  - The client application mounts and calls `GET /api/auth/me`. If valid, the session is active. If 401, the user is recognized as an unauthenticated guest.
  - Logout (`POST /api/auth/logout`) clears the `tunesense_token` cookie immediately via `res.clearCookie()`.
- **Rationale:** Because tokens expire in 7 days and cookie clearing immediately terminates browser access, a database token blacklist is not required at this stage. This maintains high throughput and low database complexity.

### 6. 1:1 Default `UserPreference` Foundation on Signup
- **Decision:** Upon successful account creation, `AuthService.signup` atomically provisions a default `UserPreference` document tied to `userId: user._id`.
  - If preference creation fails, the created user document is rolled back to prevent orphaned/inconsistent states.
- **Rationale:** Every authenticated TuneSense user must possess a valid preferences document ready for future stages (genre vectors, mood tuning, and recommendation weights) without ad-hoc document creation later.

### 7. Why OAuth (Google, Apple, Spotify) Is Deferred
- **Decision:** Third-party OAuth providers are intentionally excluded from Stage 4.
- **Rationale:** Core application identity, data models, schema integrity, and security boundaries must be proven with first-party authentication first. Introducing OAuth credentials, redirect callbacks, and token refreshes at this stage would violate strict milestone boundaries and introduce external network dependencies.

### 8. Security Considerations
- Password hashes and JWT secrets are strictly server-side and never returned in API payloads.
- Authentication failures return generic error messages (e.g. "Invalid email or password") to prevent account enumeration attacks.
- CORS is configured with explicit origin (`CLIENT_URL`) and `credentials: true`. Wildcards (`*`) are disallowed.

---

## Consequences
- Requires `cookie-parser` on Express backend and `credentials: 'include'` on all client fetch requests.
- Local development requires frontend and backend origins to be explicitly whitelisted in CORS options.
