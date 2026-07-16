# Employee Management System (EMS)

A full-stack Employee Management System with JWT authentication, role-based access
control, employee CRUD, organizational hierarchy with circular-reporting prevention,
and a responsive dashboard with charts and dark mode.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS v4 + Recharts |
| Backend | Node.js + Express.js |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT (jsonwebtoken) + bcrypt password hashing |
| Validation | express-validator (backend) + mirrored frontend validation |
| Testing | Jest + Supertest + mongodb-memory-server |
| Deployment | Docker + docker-compose (Mongo, API, nginx-served frontend) |

## Features

### Core
- **Authentication** — login/logout, JWT protected routes, bcrypt-hashed passwords,
  deactivated/deleted accounts are locked out even with a valid token
- **RBAC** — three roles:
  - **Super Admin**: full access — CRUD, delete, assign any role & manager
  - **HR Manager**: create/edit/view employees; cannot delete, cannot assign or
    modify Super Admins
  - **Employee**: views own profile; can edit only phone, profile image & password
- **Dashboard** — total / active / inactive employees, department count,
  employees-per-department & role-distribution charts, recent joiners
- **Employee management** — full CRUD with all required fields
- **Organizational hierarchy** — assign reporting managers, collapsible reporting
  tree, direct reports endpoint, **circular reporting chains are rejected**
  (self, 2-node and deeper cycles — covered by unit tests)
- **Search / filter / sort** — search by name or email (debounced), filter by
  department / role / status, sort by name or joining date, all done server-side
- **Validation** — email format, 10–15 digit phone, non-negative salary, required
  fields — enforced on both frontend and backend

### Bonus
- ✅ Pagination (server-side)
- ✅ Soft delete (records hidden, not destroyed; reports reassigned to the deleted manager's manager)
- ✅ CSV import with per-row error reporting ([sample-employees.csv](sample-employees.csv))
- ✅ Dashboard charts (Recharts, colorblind-safe palette validated for both themes)
- ✅ Dark mode (persisted, no flash on reload)
- ✅ Docker (one-command full stack)
- ✅ Unit/integration tests (auth, RBAC, hierarchy — 25 tests)

## Quick Start

### Option A — Docker (one command)

```bash
docker compose up --build
# then seed demo data:
docker compose exec api node src/seed/seed.js
```

Open **http://localhost:5173**.

### Option B — Local development

Prerequisites: Node 18+, a running MongoDB (e.g. `docker run -d -p 27017:27017 mongo:7`).

```bash
# Backend
cd backend
cp .env.example .env        # adjust JWT_SECRET / MONGO_URI if needed
                            # macOS: AirPlay occupies port 5000 — set PORT=5001
                            # and run the frontend with VITE_API_PROXY=http://localhost:5001
npm install
npm run seed                # loads demo organization
npm run dev                 # http://localhost:5000

# Frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api to :5000)
```

### Demo accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@ems.com | Admin@123 |
| HR Manager | hr@ems.com | Hr@12345 |
| Employee | arjun.rao@ems.com | Emp@1234 |

## Running Tests

```bash
cd backend
npm test
```

Tests run against an in-memory MongoDB — no database or Docker required. They cover
login, token protection, all RBAC rules (HR can't delete / assign Super Admin,
employees restricted to own limited fields), soft delete, manager assignment,
circular-reporting rejection, and the org tree.

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/          # DB connection
│   │   ├── controllers/     # auth, employees, dashboard, organization
│   │   ├── middleware/      # JWT protect, role authorize, validation, errors
│   │   ├── models/          # Employee (auth + profile in one model)
│   │   ├── routes/
│   │   ├── seed/            # demo data seeder
│   │   └── utils/           # validators, hierarchy (cycle check, tree builder)
│   └── tests/               # jest + supertest integration tests
├── frontend/
│   └── src/
│       ├── api/             # axios client with token interceptor
│       ├── components/      # layout, employee form, shared UI
│       ├── context/         # auth + theme (dark mode)
│       └── pages/           # login, dashboard, employees, org chart, profile
├── docker-compose.yml
└── API.md                   # full API documentation
```

## Deployment (free tier)

The stack deploys with **MongoDB Atlas** (database) + **Render** (API) +
**Vercel** (frontend). Config files are already in the repo:
[render.yaml](render.yaml) and [frontend/vercel.json](frontend/vercel.json).

### 1. Database — MongoDB Atlas
1. Create a free M0 cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Database Access** → add a user with password auth.
3. **Network Access** → allow `0.0.0.0/0` (Render's IPs are dynamic).
4. Copy the connection string:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ems`

### 2. API — Render
1. Push this repo to GitHub.
2. On [render.com](https://render.com): **New + → Blueprint** → select the repo.
   Render reads `render.yaml` and creates the `ems-api` service.
3. When prompted, set:
   - `MONGO_URI` — the Atlas connection string from step 1
   - `CLIENT_URL` — your Vercel URL (add it after step 3; a placeholder is fine initially)
4. After the first deploy, seed demo data: service → **Shell** → `npm run seed`.
5. Note your API URL, e.g. `https://ems-api-xxxx.onrender.com`
   (verify with `/api/health`).

### 3. Frontend — Vercel
1. Edit [frontend/vercel.json](frontend/vercel.json): replace
   `REPLACE-WITH-YOUR-RENDER-URL.onrender.com` with your actual Render URL,
   commit and push. (The rewrite proxies `/api/*` through Vercel to Render, so
   the app needs no CORS setup and no build-time API URL.)
2. On [vercel.com](https://vercel.com): **Add New → Project** → import the repo,
   set **Root Directory** to `frontend` (framework auto-detects as Vite).
3. Deploy. Then go back to Render and set `CLIENT_URL` to the Vercel URL.

> Note: Render's free tier sleeps after inactivity — the first request after a
> while takes ~30s to wake. Mention this in your submission so reviewers don't
> mistake it for a bug.

## API Documentation

See [API.md](API.md) for every endpoint with request/response examples and
role permissions.

## Design Decisions

- **Single `Employee` model for auth + profile** — every login *is* an employee, so
  splitting User/Employee would add joins without adding value at this scale.
- **Cycle prevention walks the manager chain** — before saving a manager
  assignment, the API walks upward from the proposed manager; if it reaches the
  employee, the assignment is rejected with a 400.
- **Soft delete keeps referential integrity** — deleted employees stay in the DB
  (`isDeleted: true`), are excluded from all queries, their tokens stop working,
  and their direct reports are moved up to the deleted employee's manager.
- **Server-side search/sort/pagination** — scales beyond what client-side
  filtering could handle and keeps responses small.
