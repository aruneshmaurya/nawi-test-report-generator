import { query } from '../config/db.js';

/**
 * Generate a sequential, race-condition-safe session number: SESS-YYYY-XXXXXX
 * Backed by a dedicated PostgreSQL sequence
 * @returns {Promise<string>} e.g. "SESS-2026-000001"
 */
export const generateSessionNumber = async () => {
  // Ensure the sequence exists
  await query(`CREATE SEQUENCE IF NOT EXISTS session_number_seq START 1;`);

  const result = await query(`SELECT nextval('session_number_seq') AS next_val;`);
  const seqNum = result.rows[0].next_val;
  const year = new Date().getFullYear();
  const padded = String(seqNum).padStart(6, '0');

  return `SESS-${year}-${padded}`;
};

/**
 * Validates forward-only status progression for a session:
 * DRAFT -> IN_PROGRESS -> COMPLETED -> APPROVED
 * 
 * @param {string} currentStatus
 * @param {string} targetStatus
 * @returns {{ valid: boolean, message?: string }}
 */
export const validateStatusTransition = (currentStatus, targetStatus) => {
  const lifecycle = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'APPROVED'];
  const currentIndex = lifecycle.indexOf(currentStatus);
  const targetIndex = lifecycle.indexOf(targetStatus);

  if (targetIndex === -1) {
    return { valid: false, message: `Invalid target status: "${targetStatus}". Must be one of: [${lifecycle.join(', ')}]` };
  }

  if (targetIndex === currentIndex) {
    return { valid: false, message: `Session is already in status "${currentStatus}"` };
  }

  if (targetIndex < currentIndex) {
    return {
      valid: false,
      message: `Backward status transition from "${currentStatus}" to "${targetStatus}" is not permitted.`
    };
  }

  if (targetIndex > currentIndex + 1) {
    return {
      valid: false,
      message: `Skipping status steps is not allowed. Cannot transition directly from "${currentStatus}" to "${targetStatus}". Next allowed status is "${lifecycle[currentIndex + 1]}".`
    };
  }

  return { valid: true };
};

export default {
  generateSessionNumber,
  validateStatusTransition
};
