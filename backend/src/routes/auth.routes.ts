import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { signToken } from "../utils/jwt";
import { verifyPassword } from "../utils/password";
import type { RoleName } from "../utils/roles";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.password_hash, COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE lower(u.email) = lower($1)
       GROUP BY u.id`,
      [parsed.data.email]
    );

    if (rows.length === 0) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const user = rows[0];
    const valid = await verifyPassword(parsed.data.password, user.password_hash);
    if (!valid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const roles = user.roles as RoleName[];
    const token = signToken({
      sub: user.id,
      email: user.email,
      roles
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        roles
      }
    });
  } catch (error) {
    next(error);
  }
});
