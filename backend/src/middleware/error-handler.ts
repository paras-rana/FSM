import type { NextFunction, Request, Response } from "express";

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({ message: "Route not found" });
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
};
