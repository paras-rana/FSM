import { Router } from "express";
import { pool } from "../db/pool";
import { createNotification } from "../services/notification.service";
import { authorize } from "../middleware/authorize";

export const notificationsRouter = Router();

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const unreadOnly = req.query.unread === "true";
    const { rows } = await pool.query(
      `SELECT id, user_id, type, message, is_read, created_at
       FROM notifications
       WHERE user_id = $1
         AND ($2::boolean = false OR is_read = false)
       ORDER BY created_at DESC`,
      [req.user!.id, unreadOnly]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/:id/read", async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user!.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/read-all", async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE user_id = $1 AND is_read = false`,
      [req.user!.id]
    );
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/test", authorize("ADMIN"), async (req, res, next) => {
  try {
    await createNotification(req.user!.id, "TEST", "This is a test notification.");
    res.status(201).json({ message: "Test notification created" });
  } catch (error) {
    next(error);
  }
});
