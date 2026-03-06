import { pool } from "../db/pool";
import { createCuidLikeId } from "./id";

type AuditParams = {
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
};

export const addAuditLog = async (params: AuditParams): Promise<void> => {
  await pool.query(
    `INSERT INTO audit_logs (id, entity_type, entity_id, action, performed_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [createCuidLikeId(), params.entityType, params.entityId, params.action, params.performedBy]
  );
};
