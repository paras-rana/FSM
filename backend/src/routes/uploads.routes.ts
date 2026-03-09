import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { pool } from "../db/pool";
import { createCuidLikeId } from "../utils/id";
import { env } from "../config/env";
import { parseLimitOffset } from "../utils/http";

const blockedExtensions = [".exe", ".bat", ".cmd", ".sh", ".msi", ".dll", ".js"];
const uploadDir = path.resolve(process.cwd(), "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const uploader = multer({
  storage,
  limits: {
    fileSize: env.UPLOAD_MAX_SIZE_MB * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (blockedExtensions.includes(ext)) {
      cb(new Error("File type is not allowed"));
      return;
    }
    cb(null, true);
  }
});

export const uploadsRouter = Router();

uploadsRouter.post("/", uploader.single("file"), async (req, res, next) => {
  try {
    const { entityType, entityId } = req.body as { entityType?: string; entityId?: string };
    if (!entityType || !entityId) {
      res.status(400).json({ message: "entityType and entityId are required" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const id = createCuidLikeId();
    const { rows } = await pool.query(
      `INSERT INTO attachments (
         id, entity_type, entity_id, original_file_name, server_file_path, mime_type, file_size, uploaded_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, entity_type, entity_id, original_file_name, mime_type, file_size, uploaded_by, created_at`,
      [
        id,
        entityType,
        entityId,
        req.file.originalname,
        req.file.path,
        req.file.mimetype,
        req.file.size,
        req.user!.id
      ]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

uploadsRouter.get("/", async (req, res, next) => {
  try {
    const { limit, offset } = parseLimitOffset(req);
    const entityType = (req.query.entityType as string | undefined) ?? null;
    const entityId = (req.query.entityId as string | undefined) ?? null;
    const workOrderNumberRaw = (req.query.workOrderNumber as string | undefined) ?? null;
    const from = (req.query.from as string | undefined) ?? null;
    const to = (req.query.to as string | undefined) ?? null;
    const workOrderNumber =
      workOrderNumberRaw && /^\d+$/.test(workOrderNumberRaw)
        ? Number.parseInt(workOrderNumberRaw, 10)
        : null;
    if (workOrderNumberRaw && workOrderNumber === null) {
      res.status(400).json({ message: "workOrderNumber must be a number" });
      return;
    }

    const { rows } = await pool.query(
      `SELECT
         a.id,
         a.entity_type,
         a.entity_id,
         a.original_file_name,
         a.mime_type,
         a.file_size,
         a.uploaded_by,
         a.created_at,
         wo.wo_number AS work_order_number
       FROM attachments a
       LEFT JOIN work_orders wo
         ON a.entity_type = 'WORK_ORDER'
        AND a.entity_id = wo.id
       WHERE ($3::text IS NULL OR a.entity_type = $3)
         AND ($4::text IS NULL OR a.entity_id = $4)
         AND ($5::int IS NULL OR wo.wo_number = $5)
         AND ($6::date IS NULL OR a.created_at >= $6::date)
         AND ($7::date IS NULL OR a.created_at < ($7::date + INTERVAL '1 day'))
       ORDER BY a.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset, entityType, entityId, workOrderNumber, from, to]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

uploadsRouter.get("/:id/download", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT original_file_name, server_file_path, mime_type
       FROM attachments
       WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      res.status(404).json({ message: "Attachment not found" });
      return;
    }
    const item = rows[0];
    if (!fs.existsSync(item.server_file_path)) {
      res.status(404).json({ message: "File not found on disk" });
      return;
    }
    res.setHeader("Content-Type", item.mime_type);
    res.setHeader("Content-Disposition", `attachment; filename="${item.original_file_name}"`);
    res.sendFile(path.resolve(item.server_file_path));
  } catch (error) {
    next(error);
  }
});
