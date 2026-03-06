import type { NextFunction, Request, Response } from "express";
import { hasAnyRole, type RoleName } from "../utils/roles";

export const authorize = (...roles: RoleName[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    if (!hasAnyRole(req.user.roles, roles)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    next();
  };
};
