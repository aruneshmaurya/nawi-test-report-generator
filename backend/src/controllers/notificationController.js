import { query } from '../config/db.js';
import { success, fail } from '../utils/apiResponse.js';

/**
 * Get current user's notifications (newest first)
 * GET /api/notifications
 */
export const getNotifications = async (req, res) => {
  const userId = req.user.id;

  const result = await query(
    `SELECT id, user_id, message, type, is_read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC;`,
    [userId]
  );

  return success(res, { notifications: result.rows }, 'Notifications retrieved successfully');
};

/**
 * Mark a notification as read
 * PATCH /api/notifications/:id/read
 */
export const markAsRead = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  let updateQuery;
  let params;

  if (userRole === 'ADMIN') {
    updateQuery = `UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *;`;
    params = [id];
  } else {
    updateQuery = `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *;`;
    params = [id, userId];
  }

  const result = await query(updateQuery, params);

  if (result.rows.length === 0) {
    return fail(res, 'Notification not found or access denied', 404);
  }

  return success(res, { notification: result.rows[0] }, 'Notification marked as read');
};

export default {
  getNotifications,
  markAsRead
};
