# FSM Web Application

This application manages the full lifecycle of field service work, from intake to completion and reporting. A customer or internal staff member creates a service request, the request is reviewed and prioritized, and work orders are assigned to technicians. As work progresses, teams can record labor time, attach files or evidence, and track status changes so everyone sees where each job stands.

Behind the scenes, role-based access controls what each user can do: administrators manage users and permissions, managers oversee requests and work orders, technicians execute and update assigned tasks, and accounting-oriented users review labor and cost records. The notifications and reporting endpoints support operational visibility, while the dashboard and list/detail pages in the frontend provide day-to-day workflow management.

In practical terms, the frontend acts as the operations console, the backend enforces business rules and security, and PostgreSQL stores the source of truth for requests, work orders, users, labor entries, costs, and related attachments. Together, these components provide a straightforward FSM baseline that can be expanded for production-specific processes.

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
