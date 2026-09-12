import { z } from 'zod';
import { query } from '../config/db.js';
import { generateSessionNumber, validateStatusTransition } from '../services/sessionService.js';
import { logAudit, notifyUser } from '../services/auditService.js';
import { success, fail } from '../utils/apiResponse.js';

// Validation Schemas
export const createSessionSchema = z.object({
  instrument_id: z.string().uuid('Invalid instrument UUID'),
  verification_type: z.enum(['INITIAL', 'IN_SERVICE'], {
    errorMap: () => ({ message: 'Verification type must be INITIAL or IN_SERVICE' })
  })
});

export const environmentSchema = z.object({
  temperature: z.coerce.number().optional().nullable(),
  humidity: z.coerce.number().optional().nullable(),
  atmospheric_pressure: z.coerce.number().optional().nullable(),
  supply_voltage: z.coerce.number().optional().nullable(),
  frequency: z.coerce.number().optional().nullable()
});

const referenceWeightItemSchema = z.object({
  nominal_value: z.coerce.number().positive('Nominal value must be a positive number'),
  weight_class: z.string().trim().optional().nullable(),
  certificate_no: z.string().trim().optional().nullable(),
  valid_upto: z.string().optional().nullable()
});

export const referenceWeightsSchema = z.union([
  referenceWeightItemSchema,
  z.array(referenceWeightItemSchema).min(1, 'At least one reference weight must be provided')
]);

export const updateStatusSchema = z.object({
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'APPROVED'], {
    errorMap: () => ({ message: 'Status must be DRAFT, IN_PROGRESS, COMPLETED, or APPROVED' })
  }),
  remarks: z.string().trim().optional().nullable()
});

/**
 * Create a new test session (Tester ID & Lab ID auto-filled from authenticated user)
 * POST /api/sessions
 */
export const createSession = async (req, res) => {
  const { instrument_id, verification_type } = req.body;
  const tester_id = req.user.id;
  const lab_id = req.user.lab_id;

  if (!lab_id) {
    return fail(res, 'User is not assigned to a laboratory. Cannot create a test session.', 400);
  }

  // Verify instrument exists and is active
  const instCheck = await query(
    `SELECT id, model, serial_number FROM instruments WHERE id = $1 AND is_active = true LIMIT 1;`,
    [instrument_id]
  );
  if (instCheck.rows.length === 0) {
    return fail(res, 'Specified instrument not found or is inactive', 404);
  }

  // Generate sequence-backed sequential session number
  const session_number = await generateSessionNumber();

  // Insert test session
  const insertRes = await query(
    `INSERT INTO test_sessions (
      session_number, instrument_id, lab_id, tester_id, verification_type, status, started_at
    ) VALUES ($1, $2, $3, $4, $5, 'DRAFT', now())
    RETURNING *;`,
    [session_number, instrument_id, lab_id, tester_id, verification_type]
  );

  const newSession = insertRes.rows[0];

  // Log audit
  await logAudit({
    userId: tester_id,
    sessionId: newSession.id,
    action: 'CREATE_SESSION',
    entityType: 'test_sessions',
    entityId: newSession.id,
    newValue: newSession,
    ipAddress: req.ip
  });

  return success(res, { session: newSession }, 'Test session created successfully', 201);
};

/**
 * Upsert environmental conditions for a test session
 * PATCH /api/sessions/:id/environment
 */
export const upsertEnvironment = async (req, res) => {
  const { id } = req.params;
  const { temperature, humidity, atmospheric_pressure, supply_voltage, frequency } = req.body;

  // Verify session exists
  const sessionRes = await query(`SELECT id, lab_id, status FROM test_sessions WHERE id = $1 LIMIT 1;`, [id]);
  if (sessionRes.rows.length === 0) {
    return fail(res, 'Test session not found', 404);
  }

  const session = sessionRes.rows[0];
  if (req.user.role !== 'ADMIN' && session.lab_id !== req.user.lab_id) {
    return fail(res, 'Forbidden. You cannot edit sessions belonging to another laboratory.', 403);
  }

  // Check if environment row already exists
  const existingEnv = await query(`SELECT * FROM environments WHERE session_id = $1 LIMIT 1;`, [id]);
  let envResult;

  if (existingEnv.rows.length > 0) {
    const oldEnv = existingEnv.rows[0];
    const updateRes = await query(
      `UPDATE environments SET
        temperature = COALESCE($1, temperature),
        humidity = COALESCE($2, humidity),
        atmospheric_pressure = COALESCE($3, atmospheric_pressure),
        supply_voltage = COALESCE($4, supply_voltage),
        frequency = COALESCE($5, frequency)
      WHERE session_id = $6
      RETURNING *;`,
      [temperature, humidity, atmospheric_pressure, supply_voltage, frequency, id]
    );
    envResult = updateRes.rows[0];

    await logAudit({
      userId: req.user.id,
      sessionId: id,
      action: 'UPDATE_ENVIRONMENT',
      entityType: 'environments',
      entityId: envResult.id,
      oldValue: oldEnv,
      newValue: envResult,
      ipAddress: req.ip
    });
  } else {
    const insertRes = await query(
      `INSERT INTO environments (
        session_id, temperature, humidity, atmospheric_pressure, supply_voltage, frequency
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;`,
      [id, temperature || null, humidity || null, atmospheric_pressure || null, supply_voltage || null, frequency || null]
    );
    envResult = insertRes.rows[0];

    await logAudit({
      userId: req.user.id,
      sessionId: id,
      action: 'CREATE_ENVIRONMENT',
      entityType: 'environments',
      entityId: envResult.id,
      newValue: envResult,
      ipAddress: req.ip
    });
  }

  return success(res, { environment: envResult }, 'Environmental conditions saved successfully');
};

/**
 * Add one or more reference weights to a test session
 * POST /api/sessions/:id/reference-weights
 */
export const addReferenceWeights = async (req, res) => {
  const { id } = req.params;
  const weightsPayload = req.body;

  const sessionRes = await query(`SELECT id, lab_id, status FROM test_sessions WHERE id = $1 LIMIT 1;`, [id]);
  if (sessionRes.rows.length === 0) {
    return fail(res, 'Test session not found', 404);
  }

  const session = sessionRes.rows[0];
  if (req.user.role !== 'ADMIN' && session.lab_id !== req.user.lab_id) {
    return fail(res, 'Forbidden. You cannot modify sessions belonging to another laboratory.', 403);
  }

  const weightsList = Array.isArray(weightsPayload) ? weightsPayload : [weightsPayload];
  const insertedWeights = [];

  for (const w of weightsList) {
    const insertRes = await query(
      `INSERT INTO reference_weights (session_id, nominal_value, weight_class, certificate_no, valid_upto)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [id, w.nominal_value, w.weight_class || null, w.certificate_no || null, w.valid_upto || null]
    );
    insertedWeights.push(insertRes.rows[0]);
  }

  await logAudit({
    userId: req.user.id,
    sessionId: id,
    action: 'ADD_REFERENCE_WEIGHTS',
    entityType: 'reference_weights',
    entityId: id,
    newValue: insertedWeights,
    ipAddress: req.ip
  });

  return success(res, { reference_weights: insertedWeights }, 'Reference weights added successfully', 201);
};

/**
 * Fetch a complete test session by ID with instrument, environment, and reference weights
 * GET /api/sessions/:id
 */
export const getSessionById = async (req, res) => {
  const { id } = req.params;

  const sessionRes = await query(
    `SELECT s.*,
            u.name AS tester_name, u.email AS tester_email,
            l.name AS lab_name, l.registration_no AS lab_registration_no, l.address AS lab_address
     FROM test_sessions s
     LEFT JOIN users u ON s.tester_id = u.id
     LEFT JOIN laboratories l ON s.lab_id = l.id
     WHERE s.id = $1 LIMIT 1;`,
    [id]
  );

  if (sessionRes.rows.length === 0) {
    return fail(res, 'Test session not found', 404);
  }

  const session = sessionRes.rows[0];

  // Lab scoping check
  if (req.user.role !== 'ADMIN' && session.lab_id !== req.user.lab_id) {
    return fail(res, 'Forbidden. You do not have access to sessions from this laboratory.', 403);
  }

  // Fetch instrument with manufacturer
  const instRes = await query(
    `SELECT i.*, m.name AS manufacturer_name, m.country AS manufacturer_country
     FROM instruments i
     LEFT JOIN manufacturers m ON i.manufacturer_id = m.id
     WHERE i.id = $1 LIMIT 1;`,
    [session.instrument_id]
  );

  // Fetch environment
  const envRes = await query(`SELECT * FROM environments WHERE session_id = $1 LIMIT 1;`, [id]);

  // Fetch reference weights
  const weightsRes = await query(
    `SELECT * FROM reference_weights WHERE session_id = $1 ORDER BY created_at ASC;`,
    [id]
  );

  // Fetch latest report if generated
  const reportRes = await query(
    `SELECT r.id, r.report_number, r.pdf_url, r.qr_code, r.overall_result, r.is_signed, r.generated_at
     FROM reports r
     WHERE r.session_id = $1
     ORDER BY r.generated_at DESC LIMIT 1;`,
    [id]
  );

  session.instrument = instRes.rows[0] || null;
  session.environment = envRes.rows[0] || null;
  session.reference_weights = weightsRes.rows || [];
  session.report = reportRes.rows[0] || null;

  return success(res, { session }, 'Session retrieved successfully');
};

/**
 * List sessions for dashboard with scoping and status filter
 * GET /api/sessions?lab_id=&status=
 */
export const getSessions = async (req, res) => {
  let { lab_id, status } = req.query;

  // Scoping: Non-admin users are strictly locked to their own lab
  if (req.user.role !== 'ADMIN') {
    lab_id = req.user.lab_id;
  }

  let sql = `
    SELECT s.id, s.session_number, s.verification_type, s.status, s.started_at, s.completed_at, s.overall_result, s.created_at,
           i.model AS instrument_model, i.serial_number AS instrument_serial, i.accuracy_class,
           m.name AS manufacturer_name,
           u.name AS tester_name,
           l.name AS lab_name,
           r.report_number,
           r.pdf_url,
           r.is_signed
    FROM test_sessions s
    LEFT JOIN instruments i ON s.instrument_id = i.id
    LEFT JOIN manufacturers m ON i.manufacturer_id = m.id
    LEFT JOIN users u ON s.tester_id = u.id
    LEFT JOIN laboratories l ON s.lab_id = l.id
    LEFT JOIN LATERAL (
      SELECT report_number, pdf_url, is_signed
      FROM reports
      WHERE session_id = s.id
      ORDER BY generated_at DESC
      LIMIT 1
    ) r ON true
    WHERE 1=1
  `;
  const params = [];

  if (lab_id) {
    params.push(lab_id);
    sql += ` AND s.lab_id = $${params.length}`;
  }

  if (status) {
    params.push(status);
    sql += ` AND s.status = $${params.length}`;
  }

  sql += ` ORDER BY s.started_at DESC;`;

  const result = await query(sql, params);
  return success(res, { sessions: result.rows }, 'Sessions retrieved successfully');
};

/**
 * Update session status (Forward transitions only: DRAFT -> IN_PROGRESS -> COMPLETED -> APPROVED)
 * PATCH /api/sessions/:id/status
 */
export const updateSessionStatus = async (req, res) => {
  const { id } = req.params;
  const { status: targetStatus, remarks } = req.body;

  const sessionRes = await query(`SELECT * FROM test_sessions WHERE id = $1 LIMIT 1;`, [id]);
  if (sessionRes.rows.length === 0) {
    return fail(res, 'Test session not found', 404);
  }

  const session = sessionRes.rows[0];

  // Lab scoping check
  if (req.user.role !== 'ADMIN' && session.lab_id !== req.user.lab_id) {
    return fail(res, 'Forbidden. You do not have access to modify sessions from another laboratory.', 403);
  }

  // Approval permission check: Only REVIEWER, LAB_HEAD, or ADMIN can set APPROVED
  if (targetStatus === 'APPROVED' && !['ADMIN', 'LAB_HEAD', 'REVIEWER'].includes(req.user.role)) {
    return fail(
      res,
      'Forbidden. Only a Reviewer, Lab Head, or Administrator can approve a test session.',
      403,
      { userRole: req.user.role, requiredRoles: ['ADMIN', 'LAB_HEAD', 'REVIEWER'] }
    );
  }

  // Forward transition validation
  const transitionCheck = validateStatusTransition(session.status, targetStatus);
  if (!transitionCheck.valid) {
    return fail(res, transitionCheck.message, 400);
  }

  const isFinalizing = targetStatus === 'COMPLETED' || targetStatus === 'APPROVED';

  const updateRes = await query(
    `UPDATE test_sessions SET
      status = $1,
      remarks = COALESCE($2, remarks),
      completed_at = CASE WHEN $3 = true AND completed_at IS NULL THEN now() ELSE completed_at END,
      updated_at = now()
    WHERE id = $4
    RETURNING *;`,
    [targetStatus, remarks || null, isFinalizing, id]
  );

  const updatedSession = updateRes.rows[0];

  // Log audit
  await logAudit({
    userId: req.user.id,
    sessionId: id,
    action: 'UPDATE_STATUS',
    entityType: 'test_sessions',
    entityId: id,
    oldValue: { status: session.status, remarks: session.remarks },
    newValue: { status: updatedSession.status, remarks: updatedSession.remarks },
    ipAddress: req.ip
  });

  // Notify original tester if session was approved
  if (targetStatus === 'APPROVED' && session.tester_id) {
    const approverRes = await query(`SELECT name, email FROM users WHERE id = $1 LIMIT 1;`, [req.user.id]);
    const approverName = approverRes.rows[0]?.name || req.user.email || 'a reviewer';
    await notifyUser(
      session.tester_id,
      `Your session ${session.session_number} was approved by ${approverName}`,
      'SESSION_APPROVED'
    );
  }

  return success(
    res,
    { session: updatedSession },
    `Session status updated to ${targetStatus}`
  );
};

export default {
  createSession,
  upsertEnvironment,
  addReferenceWeights,
  getSessionById,
  getSessions,
  updateSessionStatus
};
