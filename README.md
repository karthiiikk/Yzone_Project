# DataGuard — Consent-Aware Data Sharing System

A production-grade implementation of an **OAuth 2.0 / OpenID Connect** consent management and privacy gateway. Users can granularly control, audit, and revoke third-party application access to their data through signed JWT access tokens and a tamper-evident audit chain.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 (custom dark glassmorphism theme) |
| ORM | Prisma v5 |
| Database | SQLite (local) |
| Auth Tokens | `jsonwebtoken` (JWT signing & verification) |
| Icons | Lucide React |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

The `.env` file is pre-configured for local development:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="dataguard-dev-secret-change-in-production"
```

> ⚠️ **Production**: Replace `JWT_SECRET` with a strong random string (minimum 32 characters).

### 3. Initialize the database

```bash
npx prisma db push
npx prisma db seed
```

This creates:
- **User**: Alice Johnson (`alice@example.com`)
- **App**: FitPulse Pro (`clientId: fitpulse-pro`) — health scopes
- **App**: RoutePlanner (`clientId: routeplanner`) — location scopes

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Application Modules

### 🏠 Dashboard (`/`)
- **Active Connections**: Cards with live countdown timers, granted scopes, and one-click revoke
- **Audit Trail**: Tamper-evident hash chain table showing ALLOWED/DENIED events per scope

### 👨‍💻 Developer Portal (`/developer`)
- Register new third-party apps with custom names, descriptions, and scope sets
- View all registered apps with `clientId` copy button and default scopes

### 🧪 Sandbox (`/sandbox`)
- **Step 1 — Consent Simulation**: Select any registered app → triggers the OAuth consent modal
- **Consent Modal**: Granularly check/uncheck individual scopes, pick duration (1 min → 30 days), grant → receive a signed JWT
- **Step 2 — API Tester**: Use the JWT to hit `GET /api/v1/protected-data?scope=<scope>`. See live HTTP status (`200 OK` / `403 Forbidden`), response payload, and timing.

---

## API Reference

### App Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/apps` | List all registered apps |
| `POST` | `/api/apps` | Register a new app |

**POST `/api/apps` body:**
```json
{
  "name": "MyApp",
  "description": "App description",
  "defaultScopes": ["read:health:metrics", "read:location:current"]
}
```

### Consent Flow
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/consents/request` | Initiate consent flow (returns `REQUESTED` consent) |
| `POST` | `/api/consents/grant` | Approve consent, set scopes/duration, get JWT token |
| `PATCH` | `/api/consents/:id/revoke` | Immediately revoke a consent |
| `GET` | `/api/consents` | List all consents |

**POST `/api/consents/request` body:**
```json
{ "clientId": "fitpulse-pro", "userId": "<user-id>" }
```

**POST `/api/consents/grant` body:**
```json
{
  "consentId": "<consent-id>",
  "grantedScopes": ["read:health:metrics"],
  "durationMs": 60000
}
```
Returns: `{ accessToken, expiresAt, tokenType: "Bearer", consent }`

### Protected Data (JWT Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/protected-data?scope=<scope>` | Fetch scope-filtered data with JWT auth |

**Headers:** `Authorization: Bearer <access_token>`

**Validation chain:**
1. Verify JWT signature with `JWT_SECRET`
2. Look up `Consent` by `consentId` in JWT payload
3. Check `status === ACTIVE` AND `now < expiresAt`
4. Check requested `scope` is in `grantedScopes`
5. Auto-flip to `EXPIRED` if clock ran out
6. Write tamper-evident `AuditLog` entry (`ALLOWED` or `DENIED`)
7. Return `200` with data or `403 Forbidden`

### Audit Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/audit-logs` | Full chronological audit trail |

---

## Tamper-Evident Audit Chain

Each `AuditLog` entry stores:
- `previousHash` — SHA-256 hash of the previous entry (or `"GENESIS"` for the first)
- `currentHash` — `SHA-256(previousHash + consentId + scope + status + timestamp)`

This creates a **verifiable blockchain-style chain**. Modifying any past entry invalidates all subsequent hashes.

---

## Available Scopes & Mock Data

| Scope | Returns |
|-------|---------|
| `read:health:metrics` | `{ heartRate, bloodOxygen, restingHeartRate }` |
| `read:health:steps` | `{ steps, caloriesBurned, activeMinutes }` |
| `read:health:sleep` | `{ sleepHours, deepSleepHours, remSleepHours }` |
| `read:location:current` | `{ city, lat, lng, accuracy }` |
| `read:location:history` | `{ recentPlaces[] }` |

---

## Reset & Re-seed

```bash
npx prisma migrate reset --force
```

This drops all data, recreates the schema, and runs the seed automatically.
