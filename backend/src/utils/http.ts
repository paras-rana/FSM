import type { Request } from "express";

export const parseLimitOffset = (req: Request): { limit: number; offset: number } => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 25)));
  const offset = Math.max(0, Number(req.query.offset ?? 0));
  return { limit, offset };
};
