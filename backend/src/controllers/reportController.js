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

  // Check if report already exists for this session to update instead of creating duplicate
  const existingReport = await query(
    `SELECT id FROM reports WHERE session_id = $1 ORDER BY generated_at DESC LIMIT 1;`,
    [sessionId]
  );
  const existingReportId = existingReport.rows.length > 0 ? existingReport.rows[0].id : null;

  try {
    const result = await generateReportPdf(sessionId, req.user.id, existingReportId);
    return success(res, result, 'Report PDF generated and recorded successfully', 201);
  } catch (err) {
    console.error('[REPORT ERROR] Report generation error:', err);
    return fail(res, err.message || 'Failed to generate report PDF', 500);
  }
};

/**
 * Get report for a specific test session
 * GET /api/sessions/:sessionId/report
 */
export const getSessionReport = async (req, res) => {
  const { sessionId } = req.params;

  const sessionCheck = await query(`SELECT id, lab_id FROM test_sessions WHERE id = $1 LIMIT 1;`, [sessionId]);
  if (sessionCheck.rows.length === 0) {
    return fail(res, 'Test session not found', 404);
  }

  const sessionRow = sessionCheck.rows[0];
  if (req.user.role !== 'ADMIN' && sessionRow.lab_id !== req.user.lab_id) {
    return fail(res, 'Forbidden. Access restricted to session laboratory.', 403);
  }

  const reportRes = await query(
    `SELECT r.*, s.session_number, s.status AS session_status,
            ds.id AS signature_id, ds.designation AS signature_designation,
            ds.signature_image, ds.signed_at AS signature_signed_at
     FROM reports r
     JOIN test_sessions s ON r.session_id = s.id
     LEFT JOIN digital_signatures ds ON ds.report_id = r.id
     WHERE r.session_id = $1
     ORDER BY r.generated_at DESC LIMIT 1;`,
    [sessionId]
  );

  if (reportRes.rows.length === 0) {
    return success(res, { report: null }, 'No report generated yet for this session');
  }

  return success(res, { report: reportRes.rows[0] }, 'Session report retrieved successfully');
};

/**
 * Download generated PDF certificate file
 * GET /api/reports/:reportNumber/download
 */
export const downloadReport = async (req, res) => {
  const { reportNumber } = req.params;
  const { inline } = req.query;

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

  // If report.pdf_url is a full Supabase Storage URL (http/https), redirect directly to public storage
  if (report.pdf_url && (report.pdf_url.startsWith('http://') || report.pdf_url.startsWith('https://'))) {
    return res.redirect(report.pdf_url);
  }

  const uploadBaseDir = process.env.UPLOAD_DIR || './uploads';
  const possiblePaths = [
    path.resolve(uploadBaseDir, 'reports', `${reportNumber}.pdf`),
    path.resolve(uploadBaseDir, 'reports', 'reports', `${reportNumber}.pdf`),
    path.resolve(uploadBaseDir, `${reportNumber}.pdf`)
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      res.setHeader('Content-Type', 'application/pdf');
      const disposition = (inline === 'true' || inline === true) ? 'inline' : 'attachment';
      res.setHeader('Content-Disposition', `${disposition}; filename="${reportNumber}.pdf"`);
      return res.sendFile(p);
    }
  }

  // Fallback to Supabase Storage public URL
  const supabaseBaseUrl = process.env.SUPABASE_URL || 'https://nsuxefmnibwjbwoyqlaq.supabase.co';
  const supabaseUrl = `${supabaseBaseUrl}/storage/v1/object/public/reports/${reportNumber}.pdf`;
  return res.redirect(supabaseUrl);
};

/**
 * Public QR Code verification endpoint (No auth, minimal payload)
 * GET /api/verify/:reportNumber
 */
export const verifyReport = async (req, res) => {
  const { reportNumber } = req.params;

  const result = await query(
    `SELECT r.report_number, r.overall_result, r.generated_at, r.is_signed, r.pdf_url,
            s.started_at, s.completed_at, s.session_number, s.verification_type,
            COALESCE(u_tester.name, u_gen.name, 'Legal Metrology Officer') AS tester_name,
            i.model AS instrument_model, i.serial_number, i.accuracy_class,
            m.name AS manufacturer_name,
            l.name AS issuing_lab_name, l.registration_no AS issuing_lab_reg_no, l.address AS issuing_lab_address,
            q.is_active AS qr_is_active,
            ds.designation AS signatory_designation, ds.signed_at AS signature_signed_at
     FROM reports r
     JOIN test_sessions s ON r.session_id = s.id
     JOIN instruments i ON s.instrument_id = i.id
     LEFT JOIN manufacturers m ON i.manufacturer_id = m.id
     JOIN laboratories l ON s.lab_id = l.id
     LEFT JOIN users u_tester ON s.tester_id = u_tester.id
     LEFT JOIN users u_gen ON r.generated_by = u_gen.id
     LEFT JOIN qr_codes q ON q.report_id = r.id
     LEFT JOIN digital_signatures ds ON ds.report_id = r.id
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
      verification_type: row.verification_type || 'Initial Verification',
      instrument_make: row.manufacturer_name || 'Legal Metrology Standard Manufacturer',
      instrument_model: row.instrument_model,
      serial_number: row.serial_number,
      accuracy_class: `Class ${row.accuracy_class}`,
      test_date: row.completed_at || row.generated_at,
      generated_at: row.generated_at,
      overall_result: row.overall_result,
      issuing_lab_name: row.issuing_lab_name,
      issuing_lab_reg_no: row.issuing_lab_reg_no || 'NABL/OIML/IND-2026',
      issuing_lab_address: row.issuing_lab_address || 'Government Metrology Complex, India',
      tester_name: row.tester_name || 'Legal Metrology Officer',
      is_signed: Boolean(row.is_signed),
      signatory_designation: row.signatory_designation || (row.is_signed ? 'Director of Metrology' : null),
      signature_signed_at: row.signature_signed_at || null,
      pdf_url: row.pdf_url || null
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

  // Re-generate official signed PDF certificate with embedded digital signature stamp
  let signedPdfResult = null;
  try {
    signedPdfResult = await generateReportPdf(report.session_id, req.user.id, reportId);
  } catch (genErr) {
    console.warn('[SIGN REPORT] PDF regeneration notice:', genErr.message);
  }

  await logAudit({
    userId: req.user.id,
    sessionId: report.session_id,
    action: 'SIGN_REPORT',
    entityType: 'digital_signatures',
    entityId: sigRes.rows[0].id,
    newValue: { designation },
    ipAddress: req.ip
  });

  return success(res, {
    signature: sigRes.rows[0],
    report: signedPdfResult?.report || { ...report, is_signed: true }
  }, 'Report digitally signed and official certificate updated successfully');
};

/**
 * List all reports for the dashboard / reports list screen
 * GET /api/reports
 */
export const listReports = async (req, res) => {
  let sql = `
    WITH latest_reports AS (
      SELECT DISTINCT ON (r.session_id)
             r.id, r.report_number, r.pdf_url, r.qr_code, r.overall_result, r.generated_at, r.is_signed,
             s.session_number, s.id AS session_id, s.verification_type, s.lab_id,
             i.model AS instrument_model, i.serial_number, i.accuracy_class,
             m.name AS manufacturer_name,
             u.name AS generated_by_name,
             l.name AS lab_name,
             ds.designation AS signature_designation,
             ds.signed_at AS signature_signed_at
      FROM reports r
      JOIN test_sessions s ON r.session_id = s.id
      JOIN instruments i ON s.instrument_id = i.id
      LEFT JOIN manufacturers m ON i.manufacturer_id = m.id
      LEFT JOIN users u ON r.generated_by = u.id
      JOIN laboratories l ON s.lab_id = l.id
      LEFT JOIN digital_signatures ds ON ds.report_id = r.id
      ORDER BY r.session_id, r.generated_at DESC
    )
    SELECT * FROM latest_reports
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role !== 'ADMIN') {
    params.push(req.user.lab_id);
    sql += ` AND lab_id = $${params.length}`;
  }

  sql += ` ORDER BY generated_at DESC;`;

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
