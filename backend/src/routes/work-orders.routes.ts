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
    const assignedOnlyRaw = (req.query.assignedOnly as string | undefined) ?? null;
    const assignedOnly =
      assignedOnlyRaw === null ? null : assignedOnlyRaw === "true" || assignedOnlyRaw === "1";

    const { rows } = await pool.query(
      `SELECT id, wo_number, title, description, status, lead_technician_id, service_request_id, created_at, updated_at
       FROM work_orders
       WHERE ($3::text[] IS NULL OR status = ANY($3::text[]))
         AND ($4::text[] IS NULL OR NOT (status = ANY($4::text[])))
         AND ($5::text IS NULL OR lead_technician_id = $5)
         AND ($6::timestamptz IS NULL OR COALESCE(updated_at, created_at) >= $6::timestamptz)
         AND ($7::timestamptz IS NULL OR COALESCE(updated_at, created_at) < $7::timestamptz)
         AND ($8::boolean IS NULL OR $8 = false OR lead_technician_id IS NOT NULL)
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [
        limit,
        offset,
        statusFilter.length ? statusFilter : null,
        excludeStatusFilter.length ? excludeStatusFilter : null,
        leadTechnicianId,
        updatedFrom,
        updatedTo,
        assignedOnly
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
      `SELECT id, wo_number, title, description, status, lead_technician_id, service_request_id, created_at, updated_at
       FROM work_orders
       WHERE id = $1`,
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

workOrdersRouter.post("/", authorize("MANAGER", "ADMIN"), async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    const id = createCuidLikeId();
    const { rows } = await pool.query(
      `INSERT INTO work_orders (id, title, description, lead_technician_id, service_request_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, wo_number, title, description, status, lead_technician_id, service_request_id, created_at, updated_at`,
      [
        id,
        parsed.data.title,
        parsed.data.description,
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
       RETURNING id, wo_number, title, description, status, lead_technician_id, service_request_id, created_at, updated_at`,
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
       RETURNING id, wo_number, title, description, status, lead_technician_id, service_request_id, created_at, updated_at`,
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
       RETURNING id, wo_number, title, description, status, lead_technician_id, service_request_id, created_at, updated_at`,
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
