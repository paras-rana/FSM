import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { authorize } from "../middleware/authorize";
import { createCuidLikeId } from "../utils/id";
import { parseLimitOffset } from "../utils/http";
import { addAuditLog } from "../utils/audit";
import { createNotification } from "../services/notification.service";
import { sendMailStub } from "../services/mail.service";

const publicSchema = z.object({
  requestorName: z.string().min(1),
  contactInfo: z.string().min(1),
  building: z.string().min(1),
  area: z.string().min(1),
  urgency: z.enum(["HIGH", "MEDIUM", "LOW"]),
  description: z.string().min(1)
});

export const publicServiceRequestsRouter = Router();
export const serviceRequestsRouter = Router();

publicServiceRequestsRouter.post("/public", async (req, res, next) => {
  try {
    const parsed = publicSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    const id = createCuidLikeId();
    const { rows } = await pool.query(
      `INSERT INTO service_requests (id, requestor_name, contact_info, building, area, urgency, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'SUBMITTED')
       RETURNING id, sr_number, requestor_name, contact_info, building, area, urgency, description, status, created_at, updated_at`,
      [
        id,
        parsed.data.requestorName,
        parsed.data.contactInfo,
        parsed.data.building,
        parsed.data.area,
        parsed.data.urgency,
        parsed.data.description
      ]
    );

    await sendMailStub({
      to: "ops@fsm.local",
      subject: "New Service Request",
      body: `Service Request ${rows[0].sr_number} submitted by ${parsed.data.requestorName}`
    });

    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

serviceRequestsRouter.get("/", async (req, res, next) => {
  try {
    const { limit, offset } = parseLimitOffset(req);
    const statusFilter = ((req.query.status as string | undefined) ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const { rows } = await pool.query(
      `SELECT
         sr.id,
         sr.sr_number,
         sr.requestor_name,
         sr.contact_info,
         sr.building,
         sr.area,
         sr.urgency,
         sr.description,
         sr.status,
         sr.created_at,
         sr.updated_at,
         wo.id AS work_order_id,
         wo.wo_number AS work_order_number
       FROM service_requests sr
       LEFT JOIN work_orders wo ON wo.service_request_id = sr.id
       WHERE ($3::text[] IS NULL OR sr.status = ANY($3::text[]))
       ORDER BY sr.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset, statusFilter.length ? statusFilter : null]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

serviceRequestsRouter.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         sr.id,
         sr.sr_number,
         sr.requestor_name,
         sr.contact_info,
         sr.building,
         sr.area,
         sr.urgency,
         sr.description,
         sr.status,
         sr.created_at,
         sr.updated_at,
         wo.id AS work_order_id,
         wo.wo_number AS work_order_number
       FROM service_requests sr
       LEFT JOIN work_orders wo ON wo.service_request_id = sr.id
       WHERE sr.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      res.status(404).json({ message: "Service request not found" });
      return;
    }
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

serviceRequestsRouter.post("/:id/convert-to-wo", authorize("MANAGER", "ADMIN"), async (req, res, next) => {
  try {
    const sr = await pool.query(
      `SELECT id, sr_number, description, status, requestor_name FROM service_requests WHERE id = $1`,
      [req.params.id]
    );
    if (sr.rowCount === 0) {
      res.status(404).json({ message: "Service request not found" });
      return;
    }
    if (sr.rows[0].status === "CONVERTED") {
      res.status(400).json({ message: "Service request already converted" });
      return;
    }

    const workOrderId = createCuidLikeId();
    const title = `SR-${sr.rows[0].sr_number}: ${sr.rows[0].requestor_name}`;

    const createdWo = await pool.query(
      `INSERT INTO work_orders (id, title, description, status, service_request_id)
       VALUES ($1, $2, $3, 'CREATED', $4)
       RETURNING id, wo_number, title, description, status, service_request_id, created_at, updated_at`,
      [workOrderId, title, sr.rows[0].description, req.params.id]
    );

    await pool.query(
      `UPDATE service_requests
       SET status = 'CONVERTED', updated_at = now()
       WHERE id = $1`,
      [req.params.id]
    );

    await addAuditLog({
      entityType: "WORK_ORDER",
      entityId: workOrderId,
      action: "CREATE_FROM_SERVICE_REQUEST",
      performedBy: req.user!.id
    });

    await createNotification(
      req.user!.id,
      "SERVICE_REQUEST_CONVERTED",
      `Service request ${sr.rows[0].sr_number} converted to work order ${createdWo.rows[0].wo_number}`
    );

    await sendMailStub({
      to: "requestor@example.com",
      subject: "Service Request Converted",
      body: `Your request SR-${sr.rows[0].sr_number} has been converted to work order ${createdWo.rows[0].wo_number}.`
    });

    res.status(201).json(createdWo.rows[0]);
  } catch (error) {
    next(error);
  }
});
