import { pool } from "./pool";

export const runBootstrapMigrations = async (): Promise<void> => {
  await pool.query(`
    ALTER TABLE service_requests
      ADD COLUMN IF NOT EXISTS building TEXT NOT NULL DEFAULT 'HQ',
      ADD COLUMN IF NOT EXISTS area TEXT NOT NULL DEFAULT 'General',
      ADD COLUMN IF NOT EXISTS urgency TEXT NOT NULL DEFAULT 'MEDIUM'
  `);
};
