import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { query } from '../config/db.js';
import { aggregateSessionSummary } from '../services/summaryService.js';
import { generateReportPdf } from '../services/reportService.js';
import { logAudit } from '../services/auditService.js';
import { success, fail } from '../utils/apiResponse.js';

export const updateRemarksSchema = z.object({
  remarks: z.string().trim().optional().nullable(),
  reviewer_name: z.string().trim().optional().nullable()
});

export const signReportSchema = z.object({
  designation: z.string().trim().min(2, 'Designation is required'),
  signature_image: z.string().min(10, 'Signature image (data URL or path) is required')
});

/**
 * Aggregate summary for a test session (with optional finalize=true)
 * GET /api/sessions/:sessionId/summary
 */
export const getSessionSummary = async (req, res) => {
  const { sessionId } = req.params;
  const { finalize } = req.query;

  const sessionCheck = await query(`SELECT id, lab_id, status FROM test_sessions WHERE id = $1 LIMIT 1;`, [sessionId]);
  if (sessionCheck.rows.length === 0) {
    return fail(res, 'Test session not found', 404);
  }

  const sessionRow = sessionCheck.rows[0];
  if (req.user.role !== 'ADMIN' && sessionRow.lab_id !== req.user.lab_id) {
    return fail(res, 'Forbidden. Access restricted to session laboratory.', 403);
  }

  const summary = await aggregateSessionSummary(sessionId);

  // If finalize=true, persist overall_result and set status='COMPLETED'
  if (finalize === 'true' || finalize === true) {
    await query(
      `UPDATE test_sessions SET
        overall_result = $1,
        status = 'COMPLETED',
        completed_at = COALESCE(completed_at, now()),
        remarks = COALESCE(remarks, $2),
        updated_at = now()
      WHERE id = $3;`,
      [summary.overall_result, summary.reason_string, sessionId]
    );

    await logAudit({
      userId: req.user.id,
      sessionId,
      action: 'FINALIZE_SESSION',
      entityType: 'test_sessions',
      entityId: sessionId,
      oldValue: { status: sessionRow.status },
      newValue: { status: 'COMPLETED', overall_result: summary.overall_result },
      ipAddress: req.ip
    });
  }

  return success(res, { summary }, 'Session summary aggregated successfully');
};

/**
 * Capture free-text remarks and reviewer name on summary page
 * PATCH /api/sessions/:sessionId/remarks
 */
export const updateSessionRemarks = async (req, res) => {
  const { sessionId } = req.params;
  const { remarks, reviewer_name } = req.body;

  const sessionCheck = await query(`SELECT id, lab_id FROM test_sessions WHERE id = $1 LIMIT 1;`, [sessionId]);
  if (sessionCheck.rows.length === 0) {
    return fail(res, 'Test session not found', 404);
  }

  const sessionRow = sessionCheck.rows[0];
  if (req.user.role !== 'ADMIN' && sessionRow.lab_id !== req.user.lab_id) {
    return fail(res, 'Forbidden. Access restricted to session laboratory.', 403);
  }

  const updateRes = await query(
    `UPDATE test_sessions SET
      remarks = COALESCE($1, remarks),
      updated_at = now()
    WHERE id = $2
    RETURNING id, session_number, status, overall_result, remarks;`,
    [remarks, sessionId]
  );

  await logAudit({
    userId: req.user.id,
    sessionId,
    action: 'UPDATE_REMARKS',
    entityType: 'test_sessions',
    entityId: sessionId,
    newValue: { remarks, reviewer_name },
    ipAddress: req.ip
  });

  return success(res, { session: updateRes.rows[0], reviewer_name }, 'Session remarks updated successfully');
};

/**
 * Generate official PDF report certificate
 * POST /api/sessions/:sessionId/reports
 */
export const createSessionReport = async (req, res) => {
  const { sessionId } = req.params;

  const sessionCheck = await query(`SELECT id, lab_id FROM test_sessions WHERE id = $1 LIMIT 1;`, [sessionId]);
  if (sessionCheck.rows.length === 0) {
    return fail(res, 'Test session not found', 404);
  }

  const sessionRow = sessionCheck.rows[0];
  if (req.user.role !== 'ADMIN' && sessionRow.lab_id !== req.user.lab_id) {
    return fail(res, 'Forbidden. Access restricted to session laboratory.', 403);
  }

  try {
    const result = await generateReportPdf(sessionId, req.user.id);
    return success(res, result, 'Report PDF generated and recorded successfully', 201);
  } catch (err) {
    console.error('[REPORT ERROR] Report generation error:', err);
    return fail(res, err.message || 'Failed to generate report PDF', 500);
  }
};

/**
 * Download generated PDF certificate file
 * GET /api/reports/:reportNumber/download
 */
export const downloadReport = async (req, res) => {
  const { reportNumber } = req.params;

  const reportRes = await query(
    `SELECT r.*, s.lab_id
     FROM reports r
     JOIN test_sessions s ON r.session_id = s.id
     WHERE r.report_number = $1 LIMIT 1;`,
    [reportNumber]
  );

  if (reportRes.rows.length === 0) {
    return fail(res, 'Report not found', 404);
  }

  const report = reportRes.rows[0];
  if (req.user.role !== 'ADMIN' && report.lab_id !== req.user.lab_id) {
    return fail(res, 'Forbidden. Access restricted to report laboratory.', 403);
  }

  const uploadBaseDir = process.env.UPLOAD_DIR || './uploads';
  const pdfFilePath = path.resolve(uploadBaseDir, 'reports', `${reportNumber}.pdf`);

  if (!fs.existsSync(pdfFilePath)) {
    return fail(res, 'Report PDF file not found on server storage', 404);
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${reportNumber}.pdf"`);
  return res.sendFile(pdfFilePath);
};

/**
 * Public QR Code verification endpoint (No auth, minimal payload)
 * GET /api/verify/:reportNumber
 */
export const verifyReport = async (req, res) => {
  const { reportNumber } = req.params;

  const result = await query(
    `SELECT r.report_number, r.overall_result, r.generated_at, r.is_signed,
            s.started_at, s.completed_at,
            i.model AS instrument_model, i.serial_number, i.accuracy_class,
            m.name AS manufacturer_name,
            l.name AS issuing_lab_name, l.registration_no AS issuing_lab_reg_no,
            q.is_active AS qr_is_active
     FROM reports r
     JOIN test_sessions s ON r.session_id = s.id
     JOIN instruments i ON s.instrument_id = i.id
     LEFT JOIN manufacturers m ON i.manufacturer_id = m.id
     JOIN laboratories l ON s.lab_id = l.id
     LEFT JOIN qr_codes q ON q.report_id = r.id
     WHERE r.report_number = $1 LIMIT 1;`,
    [reportNumber]
  );

  if (result.rows.length === 0 || result.rows[0].qr_is_active === false) {
    return res.status(200).json({
      success: true,
      verification_status: 'NOT_FOUND',
      is_valid: false,
      message: 'Certificate could not be verified. Invalid or inactive report number.'
    });
  }

  const row = result.rows[0];

  return res.status(200).json({
    success: true,
    verification_status: 'VERIFIED',
    is_valid: true,
    data: {
      report_number: row.report_number,
      instrument_make: row.manufacturer_name || 'Standard',
      instrument_model: row.instrument_model,
      serial_number: row.serial_number,
      accuracy_class: `Class ${row.accuracy_class}`,
      test_date: row.completed_at || row.generated_at,
      overall_result: row.overall_result,
      issuing_lab_name: row.issuing_lab_name,
      issuing_lab_reg_no: row.issuing_lab_reg_no,
      is_signed: row.is_signed
    }
  });
};

/**
 * Sign report digitally
 * POST /api/reports/:reportId/sign
 */
export const signReport = async (req, res) => {
  const { reportId } = req.params;
  const { designation, signature_image } = req.body;

  const reportRes = await query(
    `SELECT r.*, s.lab_id
     FROM reports r
     JOIN test_sessions s ON r.session_id = s.id
     WHERE r.id = $1 LIMIT 1;`,
    [reportId]
  );

  if (reportRes.rows.length === 0) {
    return fail(res, 'Report not found', 404);
  }

  const report = reportRes.rows[0];
  if (req.user.role !== 'ADMIN' && report.lab_id !== req.user.lab_id) {
    return fail(res, 'Forbidden. Access restricted to report laboratory.', 403);
  }

  // Insert digital signature
  const sigRes = await query(
    `INSERT INTO digital_signatures (
      report_id, signed_by, designation, signature_image, signed_at
    ) VALUES ($1, $2, $3, $4, now())
    RETURNING *;`,
    [reportId, req.user.id, designation, signature_image]
  );

  // Update report is_signed = true
  await query(`UPDATE reports SET is_signed = true WHERE id = $1;`, [reportId]);

  await logAudit({
    userId: req.user.id,
    sessionId: report.session_id,
    action: 'SIGN_REPORT',
    entityType: 'digital_signatures',
    entityId: sigRes.rows[0].id,
    newValue: { designation },
    ipAddress: req.ip
  });

  return success(res, { signature: sigRes.rows[0] }, 'Report signed successfully');
};

/**
 * List all reports for the dashboard / reports list screen
 * GET /api/reports
 */
export const listReports = async (req, res) => {
  let sql = `
    SELECT r.id, r.report_number, r.pdf_url, r.overall_result, r.generated_at, r.is_signed,
           s.session_number, s.id AS session_id,
           i.model AS instrument_model, i.serial_number, i.accuracy_class,
           m.name AS manufacturer_name,
           u.name AS generated_by_name,
           l.name AS lab_name
    FROM reports r
    JOIN test_sessions s ON r.session_id = s.id
    JOIN instruments i ON s.instrument_id = i.id
    LEFT JOIN manufacturers m ON i.manufacturer_id = m.id
    LEFT JOIN users u ON r.generated_by = u.id
    JOIN laboratories l ON s.lab_id = l.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role !== 'ADMIN') {
    params.push(req.user.lab_id);
    sql += ` AND s.lab_id = $${params.length}`;
  }

  sql += ` ORDER BY r.generated_at DESC;`;

  const result = await query(sql, params);
  return success(res, { reports: result.rows }, 'Reports retrieved successfully');
};

export default {
  getSessionSummary,
  updateSessionRemarks,
  createSessionReport,
  downloadReport,
  verifyReport,
  signReport,
  listReports
};
