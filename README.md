# FSM Web Application

This application manages the full lifecycle of field service work, from intake to completion and reporting. A customer or internal staff member creates a service request, the request is reviewed and prioritized, and work orders are assigned to technicians. As work progresses, teams can record labor time, attach files or evidence, and track status changes so everyone sees where each job stands.

Behind the scenes, role-based access controls what each user can do: administrators manage users and permissions, managers oversee requests and work orders, technicians execute and update assigned tasks, and accounting-oriented users review labor and cost records. The notifications and reporting endpoints support operational visibility, while the dashboard and list/detail pages in the frontend provide day-to-day workflow management.

In practical terms, the frontend acts as the operations console, the backend enforces business rules and security, and PostgreSQL stores the source of truth for requests, work orders, users, labor entries, costs, and related attachments. Together, these components provide a straightforward FSM baseline that can be expanded for production-specific processes.

Field Service Management (FSM) full-stack baseline:
- Backend: Node.js + Express + TypeScript + PostgreSQL (raw SQL)
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Database: PostgreSQL with SQL schema/seed scripts

## Recent Capabilities

- Facilities management:
  - Admin Facilities page with searchable table (name, city, zipcode filters)
  - Right-side overlay workflows for Add Facility, View Details, and Edit Details
  - Facility details include name, address, city, zipcode, contact info, and dynamic zones/rooms
- Facility-driven request/order creation:
  - Public service request form now uses configured facilities/zones
  - Work order creation requires Facility Name and supports Zone/Room selection
- User page-access management:
  - Admin can assign page visibility per user from Admin Users
  - Navigation and protected routes respect per-user page access settings
- Reports UX:
  - Separate labor and cost parameter sections
  - Output options: on-screen (new window), PDF, CSV
- Authentication and shell UX refresh:
  - Login screen redesigned with right-side sign-in panel and left hero image/quote
  - User menu moved to header (logout available from username dropdown/banner)
- Visual styling baseline update:
  - Clean white application surfaces with consistent band highlights
  - Left-edge band styling in sidebar navigation
  - Active nav item uses full-edge highlight treatment
  - App-wide button styling standardized to a light-blue style
- Dashboard KPI updates:
  - Replaced "Closed This Week" KPI with:
    - Total Cost this month and last month (material + vendor)
    - Total Labor this month and last month
- Work Orders page workflow changes:
  - Inline create section replaced by a right-slide overlay form
  - Top filters now include Facility, Status, and Date Range
  - Filters apply through an explicit "Apply Filters" button
  - Pagination added at 25 results per page (Previous/Next navigation)
  - Removed inline "Set Status" action from the list page
- Work Order Detail enhancements:
  - Status moved into the top header area (right-aligned)
  - "Update Status" now opens an overlay to select and save status
  - Description moved to top of overview content
  - Removed "Back to Work Orders" link from detail header
- Theme management update:
  - Current white/blue styling set as default app theme
  - Legacy preset themes removed
  - New related presets added (for example: Skyline Light, Slate Breeze)

## Project Structure

```text
.
|-- backend
|-- db
|-- frontend
`-- docker-compose.yml
```

## Quick Start

1. Copy `.env.example` to `.env` and set values.
2. Start PostgreSQL:
   - `docker compose up -d db`
3. Initialize DB:
   - Run `db/schema.sql`
   - Run `db/seed.sql`
   - Optional demo data: run `db/seed_demo.sql`
   - Note: backend bootstrap migrations also add missing runtime columns/tables on startup
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
