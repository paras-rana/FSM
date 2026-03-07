import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { createCuidLikeId } from "../utils/id";
import { parseLimitOffset } from "../utils/http";
import { hasAnyRole } from "../utils/roles";

const createSchema = z.object({
  workOrderId: z.string().nullable().optional(),
  technicianId: z.string().optional(),
  hours: z.number().positive(),
  entryType: z.enum(["WORK_ORDER", "TRAINING", "MEETING", "ADMIN"]),
  entryDate: z.string().date()
});

export const laborEntriesRouter = Router();

laborEntriesRouter.get("/technicians", async (req, res, next) => {
  try {
    if (!hasAnyRole(req.user!.roles, ["MANAGER", "ADMIN"])) {
      res.status(403).json({ message: "Only managers and admins can view technician options" });
      return;
    }

    const { rows } = await pool.query(
      `SELECT DISTINCT u.id, u.full_name, u.email
       FROM users u
       INNER JOIN user_roles ur ON ur.user_id = u.id
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE r.name = 'TECHNICIAN'
       ORDER BY u.full_name ASC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

laborEntriesRouter.get("/", async (req, res, next) => {
  try {
    const { limit, offset } = parseLimitOffset(req);
    const workOrderId = (req.query.workOrderId as string | undefined) ?? null;
    const from = (req.query.from as string | undefined) ?? null;
    const to = (req.query.to as string | undefined) ?? null;
    const technicianIdFilter = (req.query.technicianId as string | undefined) ?? null;
    const isManagerOrAdmin = hasAnyRole(req.user!.roles, ["MANAGER", "ADMIN"]);
    if (isManagerOrAdmin) {
      const technicianId = technicianIdFilter;
      const { rows } = await pool.query(
        `SELECT le.id, le.work_order_id, le.technician_id, le.hours, le.entry_type, le.entry_date, le.created_at,
                u.full_name AS technician_name, wo.wo_number AS work_order_number
         FROM labor_entries le
         LEFT JOIN users u ON u.id = le.technician_id
         LEFT JOIN work_orders wo ON wo.id = le.work_order_id
         WHERE ($3::text IS NULL OR le.work_order_id = $3)
           AND ($4::date IS NULL OR le.entry_date >= $4::date)
           AND ($5::date IS NULL OR le.entry_date <= $5::date)
           AND ($6::text IS NULL OR le.technician_id = $6)
         ORDER BY le.entry_date DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset, workOrderId, from, to, technicianId]
      );
      res.json(rows);
      return;
    }

    const { rows } = await pool.query(
      `SELECT le.id, le.work_order_id, le.technician_id, le.hours, le.entry_type, le.entry_date, le.created_at,
              u.full_name AS technician_name, wo.wo_number AS work_order_number
       FROM labor_entries le
       LEFT JOIN users u ON u.id = le.technician_id
       LEFT JOIN work_orders wo ON wo.id = le.work_order_id
       WHERE le.technician_id = $1
         AND ($4::text IS NULL OR le.work_order_id = $4)
         AND ($5::date IS NULL OR le.entry_date >= $5::date)
         AND ($6::date IS NULL OR le.entry_date <= $6::date)
       ORDER BY le.entry_date DESC
       LIMIT $2 OFFSET $3`,
      [req.user!.id, limit, offset, workOrderId, from, to]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

laborEntriesRouter.post("/", async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    if (!hasAnyRole(req.user!.roles, ["TECHNICIAN", "MANAGER", "ADMIN"])) {
      res.status(403).json({ message: "Only technicians, managers, and admins can create labor entries" });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (parsed.data.entryDate < today) {
      res.status(400).json({ message: "Backdating is not allowed in initial implementation" });
      return;
    }

    const isManagerOrAdmin = hasAnyRole(req.user!.roles, ["MANAGER", "ADMIN"]);
    const technicianId = parsed.data.technicianId ?? req.user!.id;

    if (!isManagerOrAdmin && technicianId !== req.user!.id) {
      res.status(403).json({ message: "Technicians may only create labor entries for themselves" });
      return;
    }

    const id = createCuidLikeId();
    const { rows } = await pool.query(
      `INSERT INTO labor_entries (id, work_order_id, technician_id, hours, entry_type, entry_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, work_order_id, technician_id, hours, entry_type, entry_date, created_at`,
      [
        id,
        parsed.data.workOrderId ?? null,
        technicianId,
        parsed.data.hours,
        parsed.data.entryType,
        parsed.data.entryDate
      ]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});
