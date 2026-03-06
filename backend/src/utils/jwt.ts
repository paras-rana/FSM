import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import type { RoleName } from "./roles";

export type TokenPayload = {
  sub: string;
  email: string;
  roles: RoleName[];
};

export const signToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
};
