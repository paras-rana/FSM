import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing bearer token" });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email, roles: payload.roles };
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
