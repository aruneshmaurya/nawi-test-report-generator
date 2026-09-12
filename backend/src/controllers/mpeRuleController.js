import { query } from '../config/db.js';
import { success } from '../utils/apiResponse.js';

/**
 * List raw OIML MPE rules (Admin & Lab Head only)
 * GET /api/mpe-rules?accuracy_class=&verification_type=
 */
export const getMpeRules = async (req, res) => {
  const { accuracy_class, verification_type } = req.query;

  let sql = `
    SELECT id, accuracy_class, verification_type, min_range, max_range, mpe, formula, version, is_active, created_at
    FROM oiml_mpe_rules
    WHERE is_active = true
  `;
  const params = [];

  if (accuracy_class) {
    params.push(accuracy_class.trim().toUpperCase());
    sql += ` AND UPPER(accuracy_class) = $${params.length}`;
  }

  if (verification_type) {
    params.push(verification_type.trim().toUpperCase());
    sql += ` AND UPPER(verification_type) = $${params.length}`;
  }

  sql += ` ORDER BY accuracy_class ASC, verification_type ASC, min_range ASC;`;

  const result = await query(sql, params);

  return success(res, { rules: result.rows }, 'OIML MPE rules retrieved successfully');
};

export default {
  getMpeRules
};
