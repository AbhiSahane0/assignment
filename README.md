# Employee Management System (EMS)

A full-stack Employee Management System with JWT authentication, three-tier
role-based access control, employee CRUD, an organizational hierarchy with
circular-reporting prevention, and a responsive dashboard with charts and dark
mode.

**Live demo:** _add your Vercel URL here_ · **API:** _add your Render URL here_
> Note: the API runs on Render's free tier, which sleeps after inactivity —
> the first request may take ~30 seconds to wake.

## Project Overview

Organizations need one place to manage employee records, control who can see
and change what, and understand the reporting structure. EMS provides exactly
that: Super Admins manage everything, HR Managers handle day-to-day employee
records within guardrails, and Employees self-serve their own profile — all on
top of a single API with validation and auditability (soft deletes) built in.

## Features

### Core
- **Authentication** — login/logout, JWT-protected routes, bcrypt-hashed
  passwords; deactivated or deleted accounts are locked out even with a
  previously issued token
- **RBAC (3 roles)**
  - *Super Admin* — full access: CRUD, delete, assign any role and manager
  - *HR Manager* — create/edit/view employees; cannot delete, cannot assign
    or modify Super Admins
  - *Employee* — views own profile; edits only phone, photo and password
- **Dashboard** — total/active/inactive employees, department count,
  employees-per-department and role-distribution charts, recent joiners
- **Employee management** — full CRUD with all required fields (ID, name,
  email, phone, department, designation, salary, joining date, status, role,
  reporting manager, profile image)
- **Organizational hierarchy** — assign reporting managers, collapsible org
  tree, direct-reports view, and **rejection of circular reporting chains**
  (self, two-node, and deeper cycles — all covered by tests)
- **Search / filter / sort** — debounced search on name/email; filters for
  department, role, status; sortable by name and joining date — all
  server-side
- **Validation** — email, phone (10–15 digits), non-negative salary, required
  fields — enforced in the UI *and* on the API

### Bonus
- ✅ Server-side pagination
- ✅ Soft delete (audit-friendly; reports reassigned automatically)
- ✅ CSV import with per-row error reporting ([sample-employees.csv](sample-employees.csv))
- ✅ Dashboard charts (colorblind-safe palette, validated for both themes)
- ✅ Dark mode (persisted, no flash on reload)
- ✅ Docker (`docker compose up` runs Mongo + API + frontend)
- ✅ 25 unit/integration tests (auth, RBAC, hierarchy)
- ✅ Deployment configs (Render + Vercel + Atlas)
- ✅ Toast notifications, loading skeletons, empty states, confirmation dialogs

## Tech Stack — and why

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | typed components catch errors at build time; Vite for fast DX |
| Styling | Tailwind CSS v4 | consistent spacing/design tokens, dark mode via one class |
| Icons / Charts | lucide-react, Recharts | tree-shakeable icons; declarative charts |
| Backend | Node.js + Express.js | minimal, middleware-first — RBAC and validation compose cleanly |
| Database | MongoDB + Mongoose | the reporting hierarchy is a natural self-reference between documents (see [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md)) |
| Auth | JWT + bcrypt | stateless auth that scales horizontally; slow salted hashing for passwords |
| Validation | express-validator | declarative per-field rules, mirrored in the frontend |
| Testing | Jest + Supertest + mongodb-memory-server | full API tests with zero external dependencies |

Longer rationale for each choice: **[DESIGN_DECISIONS.md](DESIGN_DECISIONS.md)**.

## Architecture

```mermaid
flowchart LR
    subgraph Browser
        R[React SPA<br/>TypeScript + Tailwind]
    end
    subgraph Server["Node.js"]
        M[Middleware<br/>JWT verify → RBAC → validate]
        C[Express Controllers]
    end
    DB[(MongoDB<br/>employees collection)]

    R -- "REST /api/* (Bearer JWT)" --> M --> C --> DB
```

- The SPA calls the REST API with a Bearer token; an axios interceptor
  attaches it and redirects to login on 401.
- Every request passes through: JWT verification → role authorization →
  input validation → controller.
- Database schema and ER diagram: **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)**.

## Installation

### Option A — Docker (one command)

```bash
docker compose up --build
docker compose exec api node src/seed/seed.js   # seed demo data
# open http://localhost:5173
```

### Option B — Local development

Prerequisites: Node 18+, a MongoDB instance (Atlas connection string, or
`docker run -d -p 27017:27017 mongo:7`).

```bash
# Backend
cd backend
cp .env.example .env       # set MONGO_URI and JWT_SECRET
npm install
npm run seed               # creates Super Admin, HR and 16 employees
npm run dev                # API on http://localhost:5000

# Frontend (new terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173 (proxies /api to :5000)
```

> macOS note: AirPlay occupies port 5000. Set `PORT=5001` in `backend/.env`
> and run the frontend with `VITE_API_PROXY=http://localhost:5001 npm run dev`.

### Running tests

```bash
cd backend && npm test     # 25 tests, in-memory MongoDB, no setup required
```

## Environment Variables

Backend (`backend/.env`, template in [.env.example](backend/.env.example)):

| Variable | Purpose | Example |
|---|---|---|
| `PORT` | API port | `5000` |
| `MONGO_URI` | MongoDB connection string — **must include the db name** | `mongodb+srv://user:pass@cluster.mongodb.net/ems` |
| `JWT_SECRET` | token signing secret (long & random in production) | — |
| `JWT_EXPIRES_IN` | token lifetime | `1d` |
| `CLIENT_URL` | allowed CORS origin | `http://localhost:5173` |

Frontend needs no env vars locally (the dev server proxies `/api`). In
production, [frontend/vercel.json](frontend/vercel.json) rewrites `/api/*` to
the deployed API.

## Demo Credentials (after `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@ems.com` | `Admin@123` |
| HR Manager | `hr@ems.com` | `Hr@12345` |
| Employee | `arjun.rao@ems.com` | `Emp@1234` |

## API

Full documentation with request/response/error examples:
**[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** · Importable collection:
**[POSTMAN_COLLECTION.json](POSTMAN_COLLECTION.json)** (run *Login* first — it
stores the token automatically).

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/login` | public |
| POST | `/api/auth/logout` | authenticated |
| GET | `/api/auth/me` | authenticated |
| GET | `/api/employees` | Super Admin, HR |
| POST | `/api/employees` | Super Admin, HR |
| GET | `/api/employees/:id` | any (employees: own record) |
| PUT | `/api/employees/:id` | role-dependent field rules |
| DELETE | `/api/employees/:id` | Super Admin |
| PATCH | `/api/employees/:id/manager` | Super Admin, HR |
| GET | `/api/employees/:id/reportees` | Super Admin, HR |
| POST | `/api/employees/import` | Super Admin, HR |
| GET | `/api/organization/tree` | authenticated |
| GET | `/api/dashboard/stats` | Super Admin, HR |

## Folder Structure

```
├── backend/
│   ├── src/
│   │   ├── config/          # DB connection
│   │   ├── controllers/     # auth, employees, dashboard, organization
│   │   ├── middleware/      # JWT protect, role authorize, validate, errors
│   │   ├── models/          # Employee (auth + profile + hierarchy)
│   │   ├── routes/
│   │   ├── seed/            # demo data seeder (npm run seed)
│   │   └── utils/           # validators, hierarchy (cycle check, tree)
│   └── tests/               # Jest + Supertest integration tests
├── frontend/
│   └── src/
│       ├── api/             # axios client with token interceptor
│       ├── components/      # layout, employee form, shared UI, toasts
│       ├── context/         # auth, theme (dark mode), toast
│       └── pages/           # login, dashboard, employees, org chart, profile
├── screenshots/
├── docker-compose.yml
├── render.yaml              # Render deploy blueprint
├── API_DOCUMENTATION.md
├── DATABASE_SCHEMA.md
├── DESIGN_DECISIONS.md
└── POSTMAN_COLLECTION.json
```

## Screenshots

| | |
|---|---|
| ![Login](screenshots/login.png) | ![Dashboard](screenshots/dashboard.png) |
| ![Employees](screenshots/employees.png) | ![Org chart](screenshots/org-chart.png) |
| ![Dark mode](screenshots/dashboard-dark.png) | ![Profile](screenshots/profile.png) |

## Deployment (free tier)

The stack deploys with **MongoDB Atlas** + **Render** (API) + **Vercel**
(frontend). Configs are in the repo: [render.yaml](render.yaml),
[frontend/vercel.json](frontend/vercel.json).

1. **Atlas** — create a free M0 cluster, a DB user, allow `0.0.0.0/0`, copy
   the connection string **ending in `/ems`**.
2. **Render** — New + → Blueprint → this repo. Set `MONGO_URI` (from step 1)
   and `CLIENT_URL` (your Vercel URL). Seed once via a local
   `MONGO_URI=<atlas-uri> npm run seed`.
3. **Vercel** — import the repo with root directory `frontend`; make sure the
   rewrite destination in `vercel.json` points at your Render URL **including
   the `/api/:path*` suffix**.

## Future Improvements

- Refresh tokens + token blacklisting for instant server-side logout
- Profile image uploads to S3/Cloudinary instead of URLs
- Audit log (who changed what, when) building on the soft-delete foundation
- Bulk actions (multi-select deactivate / reassign manager)
- Departments as first-class entities with budgets and heads
- E2E tests (Playwright) on top of the existing API test suite
- CI pipeline (GitHub Actions: lint, test, build on every push)
