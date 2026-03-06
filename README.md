# FSM Web Application

Field Service Management (FSM) full-stack baseline:
- Backend: Node.js + Express + TypeScript + PostgreSQL (raw SQL)
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Database: PostgreSQL with SQL schema/seed scripts

## Project Structure

```text
.
├─ backend
├─ db
├─ frontend
└─ docker-compose.yml
```

## Quick Start

1. Copy `.env.example` to `.env` and set values.
2. Start PostgreSQL:
   - `docker compose up -d db`
3. Initialize DB:
   - Run `db/schema.sql`
   - Run `db/seed.sql`
   - Optional demo data: run `db/seed_demo.sql`
4. Start backend:
   - `cd backend`
   - `npm install`
   - `npm run dev`
5. Start frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`
6. Optional backend smoke test (backend must be running):
   - `cd backend`
   - `npm run smoke`

## Default Seed User

- Email: `admin@fsm.local`
- Password: `Admin123!`

Change seeded credentials before production use.

## Demo Seed Users

- Manager: `manager@fsm.local` / `Manager123!`
- Technician: `tech@fsm.local` / `Tech12345!`
- Accountant: `accountant@fsm.local` / `Account123!`
