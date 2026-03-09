import { pool } from "./pool";
import { PERSONA_PAGE_ACCESS, type PageAccessKey } from "../utils/page-access";
import type { RoleName } from "../utils/roles";

export const runBootstrapMigrations = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS facilities (
      id VARCHAR(25) PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      address TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT '',
      zipcode TEXT NOT NULL DEFAULT '',
      contact_info TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS facility_zones (
      id VARCHAR(25) PRIMARY KEY,
      facility_id VARCHAR(25) NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (facility_id, name)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_facility_zones_facility_id
    ON facility_zones(facility_id)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_page_access (
      user_id VARCHAR(25) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      page_key TEXT NOT NULL,
      PRIMARY KEY (user_id, page_key)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_page_access_user_id
    ON user_page_access(user_id)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS role_page_access (
      role_id VARCHAR(25) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      page_key TEXT NOT NULL,
      PRIMARY KEY (role_id, page_key)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_role_page_access_role_id
    ON role_page_access(role_id)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS work_order_notes (
      id VARCHAR(25) PRIMARY KEY,
      work_order_id VARCHAR(25) NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
      note TEXT NOT NULL,
      created_by VARCHAR(25) NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_work_order_notes_work_order_id
    ON work_order_notes(work_order_id, created_at DESC)
  `);

  const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM role_page_access`);
  const currentCount = rows[0]?.count ?? 0;
  if (currentCount === 0) {
    for (const role of Object.keys(PERSONA_PAGE_ACCESS) as RoleName[]) {
      const pages = PERSONA_PAGE_ACCESS[role] as PageAccessKey[];
      for (const page of pages) {
        await pool.query(
          `INSERT INTO role_page_access (role_id, page_key)
           SELECT id, $2
           FROM roles
           WHERE name = $1
           ON CONFLICT DO NOTHING`,
          [role, page]
        );
      }
    }
  }

  await pool.query(`
    ALTER TABLE service_requests
      ADD COLUMN IF NOT EXISTS building TEXT NOT NULL DEFAULT 'HQ',
      ADD COLUMN IF NOT EXISTS area TEXT NOT NULL DEFAULT 'General',
      ADD COLUMN IF NOT EXISTS urgency TEXT NOT NULL DEFAULT 'MEDIUM'
  `);

  await pool.query(`
    ALTER TABLE work_orders
      ADD COLUMN IF NOT EXISTS facility_name TEXT NOT NULL DEFAULT 'HQ',
      ADD COLUMN IF NOT EXISTS zone_name TEXT NULL,
      ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ NULL
  `);

  await pool.query(`
    ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS chk_work_orders_status
  `);
  await pool.query(`
    ALTER TABLE work_orders
      ADD CONSTRAINT chk_work_orders_status CHECK (
        status IN (
          'CREATED',
          'ASSIGNED',
          'IN_PROGRESS',
          'WAITING_FOR_PARTS',
          'COMPLETED',
          'CHECKED_AND_CLOSED',
          'REOPENED',
          'ARCHIVED'
        )
      )
  `);

  await pool.query(`
    ALTER TABLE facilities
      ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS zipcode TEXT NOT NULL DEFAULT ''
  `);
};
