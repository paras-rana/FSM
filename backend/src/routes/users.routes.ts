import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { authorize } from "../middleware/authorize";
import { createCuidLikeId } from "../utils/id";
import {
  ALL_PAGE_ACCESS_KEYS,
  isPageAccessKey,
  loadPersonaAccessMapFromDb,
  PERSONA_PAGE_ACCESS,
  resolvePageAccessFromRoleAccessMap
} from "../utils/page-access";
import { hashPassword } from "../utils/password";
import type { RoleName } from "../utils/roles";

const roleNameSchema = z.enum(["TECHNICIAN", "MANAGER", "ACCOUNTANT", "ADMIN"]);

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(8),
  persona: roleNameSchema
});

const setRolesSchema = z.object({
  roles: z.array(roleNameSchema).min(1).max(1)
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8)
});

const setPersonaAccessSchema = z.record(z.string(), z.array(z.string()));

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

usersRouter.get("/pages", async (_req, res) => {
  res.json(ALL_PAGE_ACCESS_KEYS);
});

usersRouter.get("/persona-access", async (_req, res, next) => {
  try {
    const map = await loadPersonaAccessMapFromDb();
    res.json(map);
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/persona-access", async (req, res, next) => {
  const client = await pool.connect();
  let startedTransaction = false;
  try {
    const parsed = setPersonaAccessSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    const nextMap: Record<RoleName, string[]> = {
      ADMIN: parsed.data.ADMIN ?? [],
      MANAGER: parsed.data.MANAGER ?? [],
      TECHNICIAN: parsed.data.TECHNICIAN ?? [],
      ACCOUNTANT: parsed.data.ACCOUNTANT ?? []
    };

    for (const role of Object.keys(nextMap) as RoleName[]) {
      const uniquePages = Array.from(new Set(nextMap[role]));
      if (!uniquePages.every(isPageAccessKey)) {
        res.status(400).json({ message: `Invalid page key for ${role}` });
        return;
      }
      nextMap[role] = uniquePages;
    }

    await client.query("BEGIN");
    startedTransaction = true;
    await client.query(`DELETE FROM role_page_access`);

    for (const role of Object.keys(nextMap) as RoleName[]) {
      for (const page of nextMap[role]) {
        await client.query(
          `INSERT INTO role_page_access (role_id, page_key)
           SELECT id, $2
           FROM roles
           WHERE name = $1`,
          [role, page]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ message: "Persona access updated" });
  } catch (error) {
    if (startedTransaction) {
      await client.query("ROLLBACK");
    }
    next(error);
  } finally {
    client.release();
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

usersRouter.get("/:id/page-access", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.name
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1
       ORDER BY r.name ASC`,
      [req.params.id]
    );
    const roles = rows.map((row) => row.name as RoleName);
    const map = await loadPersonaAccessMapFromDb();
    const pageAccess = resolvePageAccessFromRoleAccessMap(roles, map);
    res.json({ userId: req.params.id, pages: pageAccess });
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/", async (req, res, next) => {
  const client = await pool.connect();
  let startedTransaction = false;
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    const id = createCuidLikeId();
    const hashed = await hashPassword(parsed.data.password);
    await client.query("BEGIN");
    startedTransaction = true;
    const { rows } = await client.query(
      `INSERT INTO users (id, email, full_name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, created_at`,
      [id, parsed.data.email, parsed.data.fullName, hashed]
    );
    const roleRow = await client.query(`SELECT id FROM roles WHERE name = $1`, [parsed.data.persona]);
    if (roleRow.rows.length !== 1) {
      await client.query("ROLLBACK");
      res.status(400).json({ message: "Invalid persona" });
      return;
    }
    await client.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [id, roleRow.rows[0].id]);
    await client.query("COMMIT");
    res.status(201).json(rows[0]);
  } catch (error) {
    if (startedTransaction) {
      await client.query("ROLLBACK");
    }
    next(error);
  } finally {
    client.release();
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

usersRouter.post("/:id/page-access", async (_req, res) => {
  res.status(400).json({
    message: "Page access is persona-based. Update user role/persona instead."
  });
});
