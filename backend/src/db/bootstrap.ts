import { pool } from "./pool";

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
    ALTER TABLE service_requests
      ADD COLUMN IF NOT EXISTS building TEXT NOT NULL DEFAULT 'HQ',
      ADD COLUMN IF NOT EXISTS area TEXT NOT NULL DEFAULT 'General',
      ADD COLUMN IF NOT EXISTS urgency TEXT NOT NULL DEFAULT 'MEDIUM'
  `);

  await pool.query(`
    ALTER TABLE work_orders
      ADD COLUMN IF NOT EXISTS facility_name TEXT NOT NULL DEFAULT 'HQ',
      ADD COLUMN IF NOT EXISTS zone_name TEXT NULL
  `);

  await pool.query(`
    ALTER TABLE facilities
      ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS zipcode TEXT NOT NULL DEFAULT ''
  `);
};
