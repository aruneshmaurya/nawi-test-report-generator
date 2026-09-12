import { query } from '../config/db.js';

/**
 * Log an audit trail entry into the audit_logs table
 * @param {object} params
 * @param {string} params.userId - UUID of user performing the action
 * @param {string} [params.sessionId] - UUID of associated test session
 * @param {string} params.action - Action identifier (e.g. 'CREATE_SESSION', 'UPDATE_STATUS', 'UPDATE_ENVIRONMENT')
 * @param {string} [params.entityType] - Entity affected (e.g. 'test_sessions', 'environments', 'reference_weights')
 * @param {string} [params.entityId] - UUID of the entity
 * @param {object} [params.oldValue] - Previous state snapshot
 * @param {object} [params.newValue] - New state snapshot
 * @param {string} [params.ipAddress] - Client IP address
 */
export const logAudit = async ({
  userId,
  sessionId = null,
  action,
  entityType = null,
  entityId = null,
  oldValue = null,
  newValue = null,
  ipAddress = null
}) => {
  try {
    const res = await query(
      `INSERT INTO audit_logs (
        user_id, session_id, action, entity_type, entity_id, old_value, new_value, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, created_at;`,
      [
        userId || null,
        sessionId || null,
        action,
        entityType || null,
        entityId || null,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        ipAddress || null
      ]
    );
    return res.rows[0];
  } catch (err) {
    console.error('[AUDIT LOG ERROR] Failed to record audit log:', err.message, { action, entityType, entityId });
    // Non-fatal: do not throw to avoid crashing the main transaction unless required
    return null;
  }
};

/**
 * Create a user notification in the notifications table
 * @param {string|object} userIdOrObj - Recipient user UUID or object with { userId, message, type }
 * @param {string} [message] - Notification message content
 * @param {string} [type] - Category / Type identifier
 * @returns {Promise<object|null>}
 */
export const notifyUser = async (userIdOrObj, message, type = 'GENERAL') => {
  let targetUserId = userIdOrObj;
  let targetMessage = message;
  let targetType = type;

  if (typeof userIdOrObj === 'object' && userIdOrObj !== null) {
    targetUserId = userIdOrObj.userId;
    targetMessage = userIdOrObj.message;
    targetType = userIdOrObj.type || 'GENERAL';
  }

  if (!targetUserId || !targetMessage) {
    console.warn('[NOTIFICATION WARN] Missing userId or message for notification');
    return null;
  }

  try {
    const res = await query(
      `INSERT INTO notifications (user_id, message, type, is_read, created_at)
       VALUES ($1, $2, $3, false, now())
       RETURNING *;`,
      [targetUserId, targetMessage, targetType]
    );
    return res.rows[0];
  } catch (err) {
    console.error('[NOTIFICATION ERROR] Failed to record notification:', err.message);
    return null;
  }
};

export default {
  logAudit,
  notifyUser
};
