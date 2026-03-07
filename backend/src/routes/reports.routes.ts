import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { hasAnyRole } from "../utils/roles";

const querySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
  technicianId: z.string().optional()
});
const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);

export const reportsRouter = Router();

const formatDate = (value: Date) => value.toISOString().slice(0, 10);

const resolveDateRange = (query: {
  from?: string;
  to?: string;
  month?: string;
}): { from: string; to: string } | null => {
  if (query.month) {
    const parsedMonth = monthSchema.safeParse(query.month);
    if (!parsedMonth.success) return null;
    const [yearRaw, monthRaw] = parsedMonth.data.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;

    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const lastDay = new Date(Date.UTC(year, month, 0));
    return { from: formatDate(firstDay), to: formatDate(lastDay) };
  }

  const fromValid = z.string().date().safeParse(query.from);
  const toValid = z.string().date().safeParse(query.to);
  if (!fromValid.success || !toValid.success) return null;
  if (fromValid.data > toValid.data) return null;
  return { from: fromValid.data, to: toValid.data };
};

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

reportsRouter.get("/labor-details", async (req, res, next) => {
  try {
    const range = resolveDateRange({
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      month: req.query.month as string | undefined
    });
    if (!range) {
      res
        .status(400)
        .json({ message: "Invalid query params. Provide month=YYYY-MM or from/to date range." });
      return;
    }

    const technicianIdFilter = (req.query.technicianId as string | undefined) ?? null;
    const isManagerAdminOrAccountant = hasAnyRole(req.user!.roles, ["MANAGER", "ADMIN", "ACCOUNTANT"]);
    const technicianScope = technicianIdFilter ?? (isManagerAdminOrAccountant ? null : req.user!.id);

    const [lineRows, summaryRows] = await Promise.all([
      pool.query(
        `SELECT
           le.id,
           le.work_order_id,
           wo.wo_number AS work_order_number,
           le.technician_id,
           u.full_name AS technician_name,
           le.entry_type,
           le.hours,
           le.entry_date,
           le.created_at
         FROM labor_entries le
         LEFT JOIN users u ON u.id = le.technician_id
         LEFT JOIN work_orders wo ON wo.id = le.work_order_id
         WHERE le.entry_date BETWEEN $1::date AND $2::date
           AND ($3::text IS NULL OR le.technician_id = $3)
         ORDER BY le.entry_date DESC, le.created_at DESC`,
        [range.from, range.to, technicianScope]
      ),
      pool.query(
        `SELECT
           le.technician_id,
           u.full_name AS technician_name,
           le.entry_type,
           COALESCE(SUM(le.hours), 0)::numeric AS total_hours
         FROM labor_entries le
         LEFT JOIN users u ON u.id = le.technician_id
         WHERE le.entry_date BETWEEN $1::date AND $2::date
           AND ($3::text IS NULL OR le.technician_id = $3)
         GROUP BY le.technician_id, u.full_name, le.entry_type
         ORDER BY u.full_name ASC, le.entry_type ASC`,
        [range.from, range.to, technicianScope]
      )
    ]);

    const totalHours = lineRows.rows.reduce((sum, row) => sum + Number(row.hours || 0), 0);

    res.json({
      range,
      filters: { technicianId: technicianIdFilter },
      totals: { totalHours },
      entries: lineRows.rows,
      summary: summaryRows.rows
    });
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/cost-details", async (req, res, next) => {
  try {
    const range = resolveDateRange({
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      month: req.query.month as string | undefined
    });
    if (!range) {
      res
        .status(400)
        .json({ message: "Invalid query params. Provide month=YYYY-MM or from/to date range." });
      return;
    }

    const workOrderId = (req.query.workOrderId as string | undefined) ?? null;
    const [materialsRows, vendorRows] = await Promise.all([
      pool.query(
        `SELECT
           m.id,
           m.work_order_id,
           wo.wo_number AS work_order_number,
           m.description,
           m.quantity,
           m.unit_cost,
           m.sales_tax_rate,
           m.subtotal,
           m.tax,
           m.total,
           m.created_by,
           u.full_name AS created_by_name,
           m.created_at
         FROM materials m
         LEFT JOIN work_orders wo ON wo.id = m.work_order_id
         LEFT JOIN users u ON u.id = m.created_by
         WHERE m.created_at::date BETWEEN $1::date AND $2::date
           AND ($3::text IS NULL OR m.work_order_id = $3)
         ORDER BY m.created_at DESC`,
        [range.from, range.to, workOrderId]
      ),
      pool.query(
        `SELECT
           v.id,
           v.work_order_id,
           wo.wo_number AS work_order_number,
           v.vendor_name,
           v.invoice_number,
           v.amount,
           v.sales_tax_rate,
           v.subtotal,
           v.tax,
           v.total,
           v.created_by,
           u.full_name AS created_by_name,
           v.created_at
         FROM vendor_invoices v
         LEFT JOIN work_orders wo ON wo.id = v.work_order_id
         LEFT JOIN users u ON u.id = v.created_by
         WHERE v.created_at::date BETWEEN $1::date AND $2::date
           AND ($3::text IS NULL OR v.work_order_id = $3)
         ORDER BY v.created_at DESC`,
        [range.from, range.to, workOrderId]
      )
    ]);

    const materialTotals = materialsRows.rows.reduce(
      (acc, row) => ({
        subtotal: acc.subtotal + Number(row.subtotal || 0),
        tax: acc.tax + Number(row.tax || 0),
        total: acc.total + Number(row.total || 0)
      }),
      { subtotal: 0, tax: 0, total: 0 }
    );
    const vendorTotals = vendorRows.rows.reduce(
      (acc, row) => ({
        subtotal: acc.subtotal + Number(row.subtotal || 0),
        tax: acc.tax + Number(row.tax || 0),
        total: acc.total + Number(row.total || 0)
      }),
      { subtotal: 0, tax: 0, total: 0 }
    );

    res.json({
      range,
      filters: { workOrderId },
      totals: {
        material: materialTotals,
        vendor: vendorTotals,
        combined: {
          subtotal: materialTotals.subtotal + vendorTotals.subtotal,
          tax: materialTotals.tax + vendorTotals.tax,
          total: materialTotals.total + vendorTotals.total
        }
      },
      materials: materialsRows.rows,
      vendorInvoices: vendorRows.rows
    });
  } catch (error) {
    next(error);
  }
});
