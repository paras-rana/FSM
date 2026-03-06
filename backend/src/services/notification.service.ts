import { pool } from "../db/pool";
import { createCuidLikeId } from "../utils/id";

export const createNotification = async (
  userId: string,
  type: string,
  message: string
): Promise<void> => {
  await pool.query(
    `INSERT INTO notifications (id, user_id, type, message)
     VALUES ($1, $2, $3, $4)`,
    [createCuidLikeId(), userId, type, message]
  );
};
