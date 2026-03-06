import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { authorize } from "../middleware/authorize";
import { createCuidLikeId } from "../utils/id";
import { hasAnyRole } from "../utils/roles";

const materialSchema = z.object({
  workOrderId: z.string(),
  description: z.string().min(1),
  quantity: z.number(),
  unitCost: z.number(),
  salesTaxRate: z.number().min(0).max(1)
});

const vendorSchema = z.object({
  workOrderId: z.string(),
  vendorName: z.string().min(1),
  invoiceNumber: z.string().min(1),
  amount: z.number(),
  salesTaxRate: z.number().min(0).max(1)
});

export const costsRouter = Router();

costsRouter.get("/materials", async (req, res, next) => {
  try {
    const workOrderId = (req.query.workOrderId as string | undefined) ?? null;
    const from = (req.query.from as string | undefined) ?? null;
    const to = (req.query.to as string | undefined) ?? null;
    const { rows } = await pool.query(
      `SELECT id, work_order_id, description, quantity, unit_cost, sales_tax_rate, subtotal, tax, total, created_by, created_at
       FROM materials
       WHERE ($1::text IS NULL OR work_order_id = $1)
         AND ($2::date IS NULL OR created_at::date >= $2::date)
         AND ($3::date IS NULL OR created_at::date <= $3::date)
       ORDER BY created_at DESC`,
      [workOrderId, from, to]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

costsRouter.post("/materials", authorize("MANAGER", "ADMIN"), async (req, res, next) => {
  try {
    const parsed = materialSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    const canCorrectNegative = hasAnyRole(req.user!.roles, ["MANAGER", "ADMIN"]);
    const base = parsed.data.quantity * parsed.data.unitCost;
    if ((parsed.data.quantity < 0 || parsed.data.unitCost < 0) && !canCorrectNegative) {
      res.status(403).json({ message: "Negative correction entries require manager/admin access" });
      return;
    }
    if (base === 0) {
      res.status(400).json({ message: "Material amount cannot be zero" });
      return;
    }

    const subtotal = base;
    const tax = subtotal * parsed.data.salesTaxRate;
    const total = subtotal + tax;

    const id = createCuidLikeId();
    const { rows } = await pool.query(
      `INSERT INTO materials (id, work_order_id, description, quantity, unit_cost, sales_tax_rate, subtotal, tax, total, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, work_order_id, description, quantity, unit_cost, sales_tax_rate, subtotal, tax, total, created_by, created_at`,
      [
        id,
        parsed.data.workOrderId,
        parsed.data.description,
        parsed.data.quantity,
        parsed.data.unitCost,
        parsed.data.salesTaxRate,
        subtotal,
        tax,
        total,
        req.user!.id
      ]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

costsRouter.get("/vendor-invoices", async (req, res, next) => {
  try {
    const workOrderId = (req.query.workOrderId as string | undefined) ?? null;
    const from = (req.query.from as string | undefined) ?? null;
    const to = (req.query.to as string | undefined) ?? null;
    const { rows } = await pool.query(
      `SELECT id, work_order_id, vendor_name, invoice_number, amount, sales_tax_rate, subtotal, tax, total, created_by, created_at
       FROM vendor_invoices
       WHERE ($1::text IS NULL OR work_order_id = $1)
         AND ($2::date IS NULL OR created_at::date >= $2::date)
         AND ($3::date IS NULL OR created_at::date <= $3::date)
       ORDER BY created_at DESC`,
      [workOrderId, from, to]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

costsRouter.post("/vendor-invoices", authorize("MANAGER", "ADMIN"), async (req, res, next) => {
  try {
    const parsed = vendorSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    if (parsed.data.amount === 0) {
      res.status(400).json({ message: "Amount cannot be zero" });
      return;
    }

    if (parsed.data.amount < 0 && !hasAnyRole(req.user!.roles, ["MANAGER", "ADMIN"])) {
      res.status(403).json({ message: "Negative correction entries require manager/admin access" });
      return;
    }

    const subtotal = parsed.data.amount;
    const tax = subtotal * parsed.data.salesTaxRate;
    const total = subtotal + tax;

    const id = createCuidLikeId();
    const { rows } = await pool.query(
      `INSERT INTO vendor_invoices (id, work_order_id, vendor_name, invoice_number, amount, sales_tax_rate, subtotal, tax, total, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, work_order_id, vendor_name, invoice_number, amount, sales_tax_rate, subtotal, tax, total, created_by, created_at`,
      [
        id,
        parsed.data.workOrderId,
        parsed.data.vendorName,
        parsed.data.invoiceNumber,
        parsed.data.amount,
        parsed.data.salesTaxRate,
        subtotal,
        tax,
        total,
        req.user!.id
      ]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

costsRouter.get("/totals", async (req, res, next) => {
  try {
    const workOrderId = req.query.workOrderId as string | undefined;
    const from = (req.query.from as string | undefined) ?? null;
    const to = (req.query.to as string | undefined) ?? null;
    if (!workOrderId) {
      res.status(400).json({ message: "workOrderId is required" });
      return;
    }

    const mat = await pool.query(
      `SELECT COALESCE(sum(subtotal), 0)::numeric AS subtotal, COALESCE(sum(tax), 0)::numeric AS tax, COALESCE(sum(total), 0)::numeric AS total
       FROM materials
       WHERE work_order_id = $1
         AND ($2::date IS NULL OR created_at::date >= $2::date)
         AND ($3::date IS NULL OR created_at::date <= $3::date)`,
      [workOrderId, from, to]
    );
    const ven = await pool.query(
      `SELECT COALESCE(sum(subtotal), 0)::numeric AS subtotal, COALESCE(sum(tax), 0)::numeric AS tax, COALESCE(sum(total), 0)::numeric AS total
       FROM vendor_invoices
       WHERE work_order_id = $1
         AND ($2::date IS NULL OR created_at::date >= $2::date)
         AND ($3::date IS NULL OR created_at::date <= $3::date)`,
      [workOrderId, from, to]
    );

    const m = mat.rows[0];
    const v = ven.rows[0];
    const combined = {
      subtotal: Number(m.subtotal) + Number(v.subtotal),
      tax: Number(m.tax) + Number(v.tax),
      total: Number(m.total) + Number(v.total)
    };

    res.json({
      workOrderId,
      material: { subtotal: Number(m.subtotal), tax: Number(m.tax), total: Number(m.total) },
      vendor: { subtotal: Number(v.subtotal), tax: Number(v.tax), total: Number(v.total) },
      combined
    });
  } catch (error) {
    next(error);
  }
});
