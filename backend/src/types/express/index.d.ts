import type { RoleName } from "../../utils/roles";

declare global {
  namespace Express {
    interface UserIdentity {
      id: string;
      email: string;
      roles: RoleName[];
    }

    interface Request {
      user?: UserIdentity;
    }
  }
}

export {};
