import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { authorize } from "../middleware/authorize";
import { parseLimitOffset } from "../utils/http";
import { createCuidLikeId } from "../utils/id";

const purchaseSchema = z.object({
  partNumber: z.string().trim().min(1),
  partName: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  locationId: z.string().trim().min(1)
});

const transferSchema = z.object({
  partId: z.string().trim().min(1),
  fromLocationId: z.string().trim().min(1),
  toLocationId: z.string().trim().min(1),
  quantity: z.number().int().positive()
});

const consumeSchema = z.object({
  partId: z.string().trim().min(1),
  locationId: z.string().trim().min(1),
  quantity: z.number().int().positive()
});

export const inventoryRouter = Router();

inventoryRouter.get("/locations", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, location_type, created_at
       FROM inventory_locations
       ORDER BY
         CASE WHEN location_type = 'WAREHOUSE' THEN 0 ELSE 1 END,
         name ASC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get("/", async (req, res, next) => {
  try {
    const { limit, offset } = parseLimitOffset(req);
    const partNameRaw = (req.query.partName as string | undefined) ?? null;
    const partName = partNameRaw?.trim() ? partNameRaw.trim() : null;
    const locationIdRaw = (req.query.locationId as string | undefined) ?? null;
    const locationId = locationIdRaw?.trim() ? locationIdRaw.trim() : null;

    const { rows } = await pool.query(
      `SELECT
         p.id AS part_id,
         p.part_number,
         p.part_name,
         l.id AS location_id,
         l.name AS location_name,
         l.location_type,
         b.quantity
       FROM inventory_balances b
       JOIN inventory_parts p ON p.id = b.part_id
       JOIN inventory_locations l ON l.id = b.location_id
       WHERE b.quantity > 0
         AND ($3::text IS NULL OR p.part_name ILIKE '%' || $3 || '%' OR p.part_number ILIKE '%' || $3 || '%')
         AND ($4::text IS NULL OR l.id = $4)
       ORDER BY p.part_name ASC, l.name ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset, partName, locationId]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get("/transactions", async (req, res, next) => {
  try {
    const { limit, offset } = parseLimitOffset(req);
    const partNameRaw = (req.query.partName as string | undefined) ?? null;
    const partName = partNameRaw?.trim() ? partNameRaw.trim() : null;
    const locationIdRaw = (req.query.locationId as string | undefined) ?? null;
    const locationId = locationIdRaw?.trim() ? locationIdRaw.trim() : null;

    const { rows } = await pool.query(
      `SELECT
         t.id,
         t.transaction_type,
         t.part_id,
         p.part_number,
         p.part_name,
         t.from_location_id,
         fl.name AS from_location_name,
         fl.location_type AS from_location_type,
         t.to_location_id,
         tl.name AS to_location_name,
         tl.location_type AS to_location_type,
         t.quantity,
         t.work_order_id,
         wo.wo_number AS work_order_number,
         t.note,
         t.created_by,
         u.full_name AS created_by_name,
         t.created_at
       FROM inventory_transactions t
       JOIN inventory_parts p ON p.id = t.part_id
       LEFT JOIN inventory_locations fl ON fl.id = t.from_location_id
       LEFT JOIN inventory_locations tl ON tl.id = t.to_location_id
       LEFT JOIN users u ON u.id = t.created_by
       LEFT JOIN work_orders wo ON wo.id = t.work_order_id
       WHERE ($3::text IS NULL OR p.part_name ILIKE '%' || $3 || '%' OR p.part_number ILIKE '%' || $3 || '%')
         AND (
           $4::text IS NULL
           OR t.from_location_id = $4
           OR t.to_location_id = $4
         )
       ORDER BY t.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset, partName, locationId]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get("/available-parts", async (req, res, next) => {
  try {
    const locationId = (req.query.locationId as string | undefined) ?? null;
    if (!locationId) {
      res.status(400).json({ message: "locationId is required" });
      return;
    }

    const { rows } = await pool.query(
      `SELECT
         p.id AS part_id,
         p.part_number,
         p.part_name,
         b.quantity
       FROM inventory_balances b
       JOIN inventory_parts p ON p.id = b.part_id
       WHERE b.location_id = $1
         AND b.quantity > 0
       ORDER BY p.part_name ASC`,
      [locationId]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post("/purchases", authorize("MANAGER", "ADMIN"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const parsed = purchaseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    await client.query("BEGIN");

    const location = await client.query(
      `SELECT id, name, location_type
       FROM inventory_locations
       WHERE id = $1`,
      [parsed.data.locationId]
    );
    if (location.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ message: "Inventory location not found" });
      return;
    }

    let partId: string;
    const existingPart = await client.query(
      `SELECT id, part_name
       FROM inventory_parts
       WHERE lower(part_number) = lower($1)`,
      [parsed.data.partNumber]
    );
    if (existingPart.rowCount === 0) {
      partId = createCuidLikeId();
      await client.query(
        `INSERT INTO inventory_parts (id, part_number, part_name)
         VALUES ($1, $2, $3)`,
        [partId, parsed.data.partNumber, parsed.data.partName]
      );
    } else {
      partId = existingPart.rows[0].id as string;
    }

    await client.query(
      `INSERT INTO inventory_balances (part_id, location_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (part_id, location_id)
       DO UPDATE SET quantity = inventory_balances.quantity + EXCLUDED.quantity`,
      [partId, parsed.data.locationId, parsed.data.quantity]
    );

    await client.query(
      `INSERT INTO inventory_transactions (
         id, transaction_type, part_id, from_location_id, to_location_id, quantity, work_order_id, note, created_by
       ) VALUES ($1, 'PURCHASE', $2, NULL, $3, $4, NULL, $5, $6)`,
      [
        createCuidLikeId(),
        partId,
        parsed.data.locationId,
        parsed.data.quantity,
        `Purchased ${parsed.data.partNumber}`,
        req.user!.id
      ]
    );

    await client.query("COMMIT");
    res.status(201).json({ message: "Purchase recorded" });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

inventoryRouter.post("/transfers", authorize("MANAGER", "ADMIN"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }
    if (parsed.data.fromLocationId === parsed.data.toLocationId) {
      res.status(400).json({ message: "Source and destination cannot be the same" });
      return;
    }

    await client.query("BEGIN");

    const source = await client.query(
      `SELECT quantity
       FROM inventory_balances
       WHERE part_id = $1
         AND location_id = $2
       FOR UPDATE`,
      [parsed.data.partId, parsed.data.fromLocationId]
    );
    const sourceQty = Number(source.rows[0]?.quantity ?? 0);
    if (sourceQty < parsed.data.quantity) {
      await client.query("ROLLBACK");
      res.status(400).json({ message: "Insufficient quantity at source location" });
      return;
    }

    await client.query(
      `UPDATE inventory_balances
       SET quantity = quantity - $3
       WHERE part_id = $1
         AND location_id = $2`,
      [parsed.data.partId, parsed.data.fromLocationId, parsed.data.quantity]
    );

    await client.query(
      `INSERT INTO inventory_balances (part_id, location_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (part_id, location_id)
       DO UPDATE SET quantity = inventory_balances.quantity + EXCLUDED.quantity`,
      [parsed.data.partId, parsed.data.toLocationId, parsed.data.quantity]
    );

    await client.query(
      `INSERT INTO inventory_transactions (
         id, transaction_type, part_id, from_location_id, to_location_id, quantity, work_order_id, note, created_by
       ) VALUES ($1, 'TRANSFER', $2, $3, $4, $5, NULL, $6, $7)`,
      [
        createCuidLikeId(),
        parsed.data.partId,
        parsed.data.fromLocationId,
        parsed.data.toLocationId,
        parsed.data.quantity,
        "Inventory transfer",
        req.user!.id
      ]
    );

    await client.query("COMMIT");
    res.status(201).json({ message: "Transfer complete" });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

inventoryRouter.get("/work-orders/:id/consumed-parts", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         c.id,
         c.work_order_id,
         c.part_id,
         p.part_number,
         p.part_name,
         c.location_id,
         l.name AS location_name,
         l.location_type,
         c.quantity,
         c.consumed_by,
         u.full_name AS consumed_by_name,
         c.created_at
       FROM work_order_consumed_parts c
       JOIN inventory_parts p ON p.id = c.part_id
       JOIN inventory_locations l ON l.id = c.location_id
       LEFT JOIN users u ON u.id = c.consumed_by
       WHERE c.work_order_id = $1
       ORDER BY c.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post("/work-orders/:id/consume", authorize("TECHNICIAN", "MANAGER", "ADMIN"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const parsed = consumeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    await client.query("BEGIN");
    const wo = await client.query(`SELECT id FROM work_orders WHERE id = $1`, [req.params.id]);
    if (wo.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ message: "Work order not found" });
      return;
    }

    const balance = await client.query(
      `SELECT quantity
       FROM inventory_balances
       WHERE part_id = $1
         AND location_id = $2
       FOR UPDATE`,
      [parsed.data.partId, parsed.data.locationId]
    );
    const currentQty = Number(balance.rows[0]?.quantity ?? 0);
    if (currentQty < parsed.data.quantity) {
      await client.query("ROLLBACK");
      res.status(400).json({ message: "Insufficient inventory quantity at selected location" });
      return;
    }

    await client.query(
      `UPDATE inventory_balances
       SET quantity = quantity - $3
       WHERE part_id = $1
         AND location_id = $2`,
      [parsed.data.partId, parsed.data.locationId, parsed.data.quantity]
    );

    const consumeId = createCuidLikeId();
    await client.query(
      `INSERT INTO work_order_consumed_parts (
         id, work_order_id, part_id, location_id, quantity, consumed_by
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [consumeId, req.params.id, parsed.data.partId, parsed.data.locationId, parsed.data.quantity, req.user!.id]
    );

    await client.query(
      `INSERT INTO inventory_transactions (
         id, transaction_type, part_id, from_location_id, to_location_id, quantity, work_order_id, note, created_by
       ) VALUES ($1, 'CONSUME', $2, $3, NULL, $4, $5, $6, $7)`,
      [
        createCuidLikeId(),
        parsed.data.partId,
        parsed.data.locationId,
        parsed.data.quantity,
        req.params.id,
        "Consumed on work order",
        req.user!.id
      ]
    );

    await client.query("COMMIT");
    res.status(201).json({ message: "Part consumption recorded", id: consumeId });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});
