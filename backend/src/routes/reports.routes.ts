import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { hasAnyRole } from "../utils/roles";

const querySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
  technicianId: z.string().optional()
});

export const reportsRouter = Router();

reportsRouter.get("/dashboard", async (_req, res, next) => {
  try {
    const [statusRows, newSrCountRows, newSrRows, closedByWeekRows, openByTechRows] = await Promise.all([
      pool.query(
        `SELECT status, COUNT(*)::int AS count
         FROM work_orders
         GROUP BY status
         ORDER BY status ASC`
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count
         FROM service_requests
         WHERE status = 'SUBMITTED'`
      ),
      pool.query(
        `SELECT id, sr_number, requestor_name, building, area, urgency, status, created_at
         FROM service_requests
         WHERE status = 'SUBMITTED'
         ORDER BY created_at DESC
         LIMIT 10`
      ),
      pool.query(
        `WITH weeks AS (
           SELECT generate_series(
             date_trunc('week', current_date) - interval '3 weeks',
             date_trunc('week', current_date),
             interval '1 week'
           )::date AS week_start
         ),
         closed AS (
           SELECT
             date_trunc('week', COALESCE(updated_at, created_at))::date AS week_start,
             COUNT(*)::int AS closed_count
           FROM work_orders
           WHERE status IN ('COMPLETED', 'ARCHIVED')
           GROUP BY 1
         )
         SELECT w.week_start, COALESCE(c.closed_count, 0)::int AS closed_count
         FROM weeks w
         LEFT JOIN closed c ON c.week_start = w.week_start
         ORDER BY w.week_start ASC`
      ),
      pool.query(
        `SELECT
           u.id AS technician_id,
           u.full_name,
           COUNT(*)::int AS open_count
         FROM work_orders wo
         JOIN users u ON u.id = wo.lead_technician_id
         WHERE wo.lead_technician_id IS NOT NULL
           AND wo.status NOT IN ('COMPLETED', 'ARCHIVED')
         GROUP BY u.id, u.full_name
         ORDER BY open_count DESC, u.full_name ASC`
      )
    ]);

    res.json({
      workOrdersByStatus: statusRows.rows,
      newServiceRequests: {
        count: newSrCountRows.rows[0]?.count ?? 0,
        items: newSrRows.rows
      },
      closedByWeek: closedByWeekRows.rows,
      openAssignedByTechnician: openByTechRows.rows
    });
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/timesheets", async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid query params. Expected from and to dates." });
      return;
    }

    const isManagerAdminOrAccountant = hasAnyRole(req.user!.roles, ["MANAGER", "ADMIN", "ACCOUNTANT"]);
    const technicianFilter = parsed.data.technicianId ?? (isManagerAdminOrAccountant ? null : req.user!.id);

    const { rows } = await pool.query(
      `SELECT le.technician_id, u.full_name, le.entry_date, SUM(le.hours)::numeric AS total_hours
       FROM labor_entries le
       JOIN users u ON u.id = le.technician_id
       WHERE le.entry_date BETWEEN $1 AND $2
         AND ($3::text IS NULL OR le.technician_id = $3)
       GROUP BY le.technician_id, u.full_name, le.entry_date
       ORDER BY le.entry_date DESC, u.full_name ASC`,
      [parsed.data.from, parsed.data.to, technicianFilter]
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
});
