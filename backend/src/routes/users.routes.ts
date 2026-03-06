import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { authorize } from "../middleware/authorize";
import { createCuidLikeId } from "../utils/id";
import { hashPassword } from "../utils/password";

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(8)
});

const setRolesSchema = z.object({
  roles: z.array(z.string().min(1)).min(1)
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8)
});

export const usersRouter = Router();

usersRouter.use(authorize("ADMIN"));

usersRouter.get("/roles", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT id, name FROM roles ORDER BY name`);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.created_at,
              COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.created_at,
              COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.params.id]
    );
    if (rows.length === 0) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/", async (req, res, next) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    const id = createCuidLikeId();
    const hashed = await hashPassword(parsed.data.password);
    const { rows } = await pool.query(
      `INSERT INTO users (id, email, full_name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, created_at`,
      [id, parsed.data.email, parsed.data.fullName, hashed]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/:id/roles", async (req, res, next) => {
  try {
    const parsed = setRolesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    const userId = req.params.id;
    const { rows: roleRows } = await pool.query(
      `SELECT id, name FROM roles WHERE name = ANY($1::text[])`,
      [parsed.data.roles]
    );
    if (roleRows.length !== parsed.data.roles.length) {
      res.status(400).json({ message: "One or more roles are invalid" });
      return;
    }

    await pool.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);

    for (const role of roleRows) {
      await pool.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
        [userId, role.id]
      );
    }

    res.json({ message: "Roles updated" });
  } catch (error) {
    next(error);
  }
});

usersRouter.patch("/:id/password", async (req, res, next) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    const hashed = await hashPassword(parsed.data.newPassword);
    const result = await pool.query(
      `UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`,
      [req.params.id, hashed]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({ message: "Password reset successful" });
  } catch (error) {
    next(error);
  }
});
