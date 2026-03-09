import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { authorize } from "../middleware/authorize";
import { createCuidLikeId } from "../utils/id";
import { parseLimitOffset } from "../utils/http";
import { addAuditLog } from "../utils/audit";
import { canTransitionStatus, type WorkOrderStatus } from "../utils/work-order-status";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  facilityName: z.string().min(1),
  zoneName: z.string().optional().nullable(),
  leadTechnicianId: z.string().optional().nullable(),
  serviceRequestId: z.string().optional().nullable()
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  leadTechnicianId: z.string().nullable().optional()
});

const statusSchema = z.object({
  status: z.enum([
    "CREATED",
    "ASSIGNED",
    "IN_PROGRESS",
    "WAITING_FOR_PARTS",
    "COMPLETED",
    "REOPENED",
    "ARCHIVED"
  ])
});

const noteCreateSchema = z.object({
  note: z.string().trim().min(1).max(2000)
});

export const workOrdersRouter = Router();

workOrdersRouter.get("/", async (req, res, next) => {
  try {
    const { limit, offset } = parseLimitOffset(req);
    const statusFilter = ((req.query.status as string | undefined) ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const excludeStatusFilter = ((req.query.excludeStatus as string | undefined) ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const leadTechnicianId = (req.query.leadTechnicianId as string | undefined) ?? null;
    const updatedFrom = (req.query.updatedFrom as string | undefined) ?? null;
    const updatedTo = (req.query.updatedTo as string | undefined) ?? null;
    const facilityNameRaw = (req.query.facilityName as string | undefined) ?? null;
    const facilityName = facilityNameRaw?.trim() ? facilityNameRaw.trim() : null;
    const assignedOnlyRaw = (req.query.assignedOnly as string | undefined) ?? null;
    const assignedOnly =
      assignedOnlyRaw === null ? null : assignedOnlyRaw === "true" || assignedOnlyRaw === "1";

    const { rows } = await pool.query(
      `SELECT wo.id, wo.wo_number, wo.title, wo.description, wo.status, wo.lead_technician_id, wo.service_request_id,
              wo.facility_name, wo.zone_name,
              wo.created_at, wo.updated_at, lt.full_name AS lead_technician_name, sr.sr_number AS service_request_number
       FROM work_orders wo
       LEFT JOIN users lt ON lt.id = wo.lead_technician_id
       LEFT JOIN service_requests sr ON sr.id = wo.service_request_id
       WHERE ($3::text[] IS NULL OR wo.status = ANY($3::text[]))
         AND ($4::text[] IS NULL OR NOT (wo.status = ANY($4::text[])))
         AND ($5::text IS NULL OR wo.lead_technician_id = $5)
         AND ($6::timestamptz IS NULL OR wo.updated_at >= $6::timestamptz)
         AND ($7::timestamptz IS NULL OR wo.updated_at < $7::timestamptz)
         AND ($8::boolean IS NULL OR $8 = false OR wo.lead_technician_id IS NOT NULL)
         AND ($9::text IS NULL OR wo.facility_name = $9)
       ORDER BY wo.created_at DESC
       LIMIT $1 OFFSET $2`,
      [
        limit,
        offset,
        statusFilter.length ? statusFilter : null,
        excludeStatusFilter.length ? excludeStatusFilter : null,
        leadTechnicianId,
        updatedFrom,
        updatedTo,
        assignedOnly,
        facilityName
      ]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

workOrdersRouter.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT wo.id, wo.wo_number, wo.title, wo.description, wo.status, wo.lead_technician_id, wo.service_request_id,
              wo.facility_name, wo.zone_name,
              wo.created_at, wo.updated_at, lt.full_name AS lead_technician_name, sr.sr_number AS service_request_number
       FROM work_orders wo
       LEFT JOIN users lt ON lt.id = wo.lead_technician_id
       LEFT JOIN service_requests sr ON sr.id = wo.service_request_id
       WHERE wo.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      res.status(404).json({ message: "Work order not found" });
      return;
    }
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

workOrdersRouter.get("/:id/notes", async (req, res, next) => {
  try {
    const wo = await pool.query(`SELECT id FROM work_orders WHERE id = $1`, [req.params.id]);
    if (wo.rowCount === 0) {
      res.status(404).json({ message: "Work order not found" });
      return;
    }

    const { rows } = await pool.query(
      `SELECT n.id, n.work_order_id, n.note, n.created_by, u.full_name AS created_by_name, n.created_at
       FROM work_order_notes n
       JOIN users u ON u.id = n.created_by
       WHERE n.work_order_id = $1
       ORDER BY n.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === "42P01") {
      res.json([]);
      return;
    }
    next(error);
  }
});

workOrdersRouter.post("/:id/notes", authorize("TECHNICIAN", "MANAGER", "ADMIN", "ACCOUNTANT"), async (req, res, next) => {
  try {
    const parsed = noteCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    const wo = await pool.query(`SELECT id FROM work_orders WHERE id = $1`, [req.params.id]);
    if (wo.rowCount === 0) {
      res.status(404).json({ message: "Work order not found" });
      return;
    }

    const id = createCuidLikeId();
    const created = await pool.query(
      `INSERT INTO work_order_notes (id, work_order_id, note, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, work_order_id, note, created_by, created_at`,
      [id, req.params.id, parsed.data.note, req.user!.id]
    );
    const withName = await pool.query(
      `SELECT n.id, n.work_order_id, n.note, n.created_by, u.full_name AS created_by_name, n.created_at
       FROM work_order_notes n
       JOIN users u ON u.id = n.created_by
       WHERE n.id = $1`,
      [id]
    );

    await addAuditLog({
      entityType: "WORK_ORDER",
      entityId: req.params.id,
      action: "NOTE_ADD",
      performedBy: req.user!.id
    });

    res.status(201).json(withName.rows[0] ?? created.rows[0]);
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === "42P01") {
      res.status(503).json({ message: "Notes feature is not initialized in the database yet." });
      return;
    }
    next(error);
  }
});

workOrdersRouter.post("/", authorize("MANAGER", "ADMIN"), async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    const id = createCuidLikeId();
    const { rows } = await pool.query(
      `INSERT INTO work_orders (id, title, description, facility_name, zone_name, lead_technician_id, service_request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, wo_number, title, description, status, lead_technician_id, service_request_id, facility_name, zone_name, created_at, updated_at,
                 (SELECT full_name FROM users WHERE id = work_orders.lead_technician_id) AS lead_technician_name,
                 (SELECT sr_number FROM service_requests WHERE id = work_orders.service_request_id) AS service_request_number`,
      [
        id,
        parsed.data.title,
        parsed.data.description,
        parsed.data.facilityName.trim(),
        parsed.data.zoneName ?? null,
        parsed.data.leadTechnicianId ?? null,
        parsed.data.serviceRequestId ?? null
      ]
    );

    await addAuditLog({
      entityType: "WORK_ORDER",
      entityId: id,
      action: "CREATE",
      performedBy: req.user!.id
    });

    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

workOrdersRouter.patch("/:id", authorize("MANAGER", "ADMIN"), async (req, res, next) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    const existing = await pool.query(`SELECT id FROM work_orders WHERE id = $1`, [req.params.id]);
    if (existing.rowCount === 0) {
      res.status(404).json({ message: "Work order not found" });
      return;
    }

    const fields: string[] = [];
    const values: unknown[] = [req.params.id];

    if (parsed.data.title !== undefined) {
      fields.push(`title = $${values.length + 1}`);
      values.push(parsed.data.title);
    }
    if (parsed.data.description !== undefined) {
      fields.push(`description = $${values.length + 1}`);
      values.push(parsed.data.description);
    }
    if (parsed.data.leadTechnicianId !== undefined) {
      fields.push(`lead_technician_id = $${values.length + 1}`);
      values.push(parsed.data.leadTechnicianId);
    }

    const { rows } = await pool.query(
      `UPDATE work_orders
       SET ${fields.join(", ")}, updated_at = now()
       WHERE id = $1
       RETURNING id, wo_number, title, description, status, lead_technician_id, service_request_id, facility_name, zone_name, created_at, updated_at,
                 (SELECT full_name FROM users WHERE id = work_orders.lead_technician_id) AS lead_technician_name,
                 (SELECT sr_number FROM service_requests WHERE id = work_orders.service_request_id) AS service_request_number`,
      values
    );

    await addAuditLog({
      entityType: "WORK_ORDER",
      entityId: req.params.id,
      action: "UPDATE",
      performedBy: req.user!.id
    });

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

workOrdersRouter.post("/:id/status", authorize("MANAGER", "ADMIN"), async (req, res, next) => {
  try {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    const { rows } = await pool.query(
      `SELECT id, status FROM work_orders WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      res.status(404).json({ message: "Work order not found" });
      return;
    }

    const current = rows[0].status as WorkOrderStatus;
    const nextStatus = parsed.data.status as WorkOrderStatus;
    if (!canTransitionStatus(current, nextStatus)) {
      res.status(400).json({ message: `Invalid status transition ${current} -> ${nextStatus}` });
      return;
    }

    const updated = await pool.query(
      `UPDATE work_orders
       SET status = $2, updated_at = now()
       WHERE id = $1
       RETURNING id, wo_number, title, description, status, lead_technician_id, service_request_id, facility_name, zone_name, created_at, updated_at,
                 (SELECT full_name FROM users WHERE id = work_orders.lead_technician_id) AS lead_technician_name,
                 (SELECT sr_number FROM service_requests WHERE id = work_orders.service_request_id) AS service_request_number`,
      [req.params.id, nextStatus]
    );

    await addAuditLog({
      entityType: "WORK_ORDER",
      entityId: req.params.id,
      action: `STATUS_${nextStatus}`,
      performedBy: req.user!.id
    });

    res.json(updated.rows[0]);
  } catch (error) {
    next(error);
  }
});

workOrdersRouter.post("/:id/archive", authorize("MANAGER", "ADMIN"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT id, status FROM work_orders WHERE id = $1`, [req.params.id]);
    if (rows.length === 0) {
      res.status(404).json({ message: "Work order not found" });
      return;
    }
    if (rows[0].status !== "COMPLETED") {
      res.status(400).json({ message: "Only completed work orders can be archived" });
      return;
    }

    const updated = await pool.query(
      `UPDATE work_orders
       SET status = 'ARCHIVED', updated_at = now()
       WHERE id = $1
       RETURNING id, wo_number, title, description, status, lead_technician_id, service_request_id, facility_name, zone_name, created_at, updated_at,
                 (SELECT full_name FROM users WHERE id = work_orders.lead_technician_id) AS lead_technician_name,
                 (SELECT sr_number FROM service_requests WHERE id = work_orders.service_request_id) AS service_request_number`,
      [req.params.id]
    );

    await addAuditLog({
      entityType: "WORK_ORDER",
      entityId: req.params.id,
      action: "ARCHIVE",
      performedBy: req.user!.id
    });

    res.json(updated.rows[0]);
  } catch (error) {
    next(error);
  }
});
