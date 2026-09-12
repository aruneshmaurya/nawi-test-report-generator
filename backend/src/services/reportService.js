import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import puppeteer from 'puppeteer';
import { pool, query } from '../config/db.js';
import { aggregateSessionSummary } from './summaryService.js';
import { generateReportHtml } from '../templates/reportTemplate.js';
import { logAudit, notifyUser } from './auditService.js';
import { uploadBuffer, BUCKETS } from './storageService.js';

/**
 * Generate sequence-backed unique report number: RPT-YYYY-XXXXXX
 * @returns {Promise<string>}
 */
export const generateReportNumber = async () => {
  await query(`CREATE SEQUENCE IF NOT EXISTS report_number_seq START 1;`);
  const result = await query(`SELECT nextval('report_number_seq') AS next_val;`);
  const seqNum = result.rows[0].next_val;
  const year = new Date().getFullYear();
  const padded = String(seqNum).padStart(6, '0');
  return `RPT-${year}-${padded}`;
};

/**
 * Generate official OIML R-76 test certificate PDF with QR code and persist DB records in a safe transaction
 * 
 * @param {string} sessionId - UUID of test session
 * @param {string} userId - UUID of requesting user
 * @returns {Promise<{ report: object, download_url: string }>}
 */
export const generateReportPdf = async (sessionId, userId, existingReportId = null) => {
  // 1. Fetch full aggregated data
  const summary = await aggregateSessionSummary(sessionId);
  const session = summary.session;

  // 2. Fetch environment and reference weights
  const envRes = await query(`SELECT * FROM environments WHERE session_id = $1 LIMIT 1;`, [sessionId]);
  const weightsRes = await query(`SELECT * FROM reference_weights WHERE session_id = $1 ORDER BY created_at ASC;`, [sessionId]);

  let reportNumber;
  let reportRow = null;
  let signature = null;

  if (existingReportId) {
    const existingRes = await query(
      `SELECT r.*, ds.designation AS signature_designation, ds.signature_image, ds.signed_at AS signature_signed_at,
              u.name AS signer_name
       FROM reports r
       LEFT JOIN digital_signatures ds ON ds.report_id = r.id
       LEFT JOIN users u ON ds.signed_by = u.id
       WHERE r.id = $1 LIMIT 1;`,
      [existingReportId]
    );
    if (existingRes.rows.length > 0) {
      reportRow = existingRes.rows[0];
      reportNumber = reportRow.report_number;
      if (reportRow.signature_image) {
        signature = {
          designation: reportRow.signature_designation,
          signature_image: reportRow.signature_image,
          signer_name: reportRow.signer_name || 'Authorized Signatory',
          signed_at: reportRow.signature_signed_at
        };
      }
    }
  }

  if (!reportNumber) {
    reportNumber = await generateReportNumber();
  }

  const qrToken = crypto.randomUUID();
  const publicAppUrl = process.env.PUBLIC_APP_URL || 'https://nawi-test-report-generator.vercel.app';
  const verificationUrl = `${publicAppUrl}/verify/${reportNumber}`;

  // 4. Render QR Code to PNG data URL
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    margin: 1,
    width: 250,
    color: {
      dark: '#0b2545',
      light: '#ffffff'
    }
  });

  const pdfFileName = `${reportNumber}.pdf`;
  const storagePath = pdfFileName;

  // 5. Generate HTML from template
  const reportData = {
    report_number: reportNumber,
    overall_result: summary.overall_result,
    generated_at: reportRow?.generated_at || new Date().toISOString(),
    remarks: summary.reason_string
  };

  const instrumentData = {
    model: session.instrument_model,
    serial_number: session.instrument_serial,
    manufacturer_name: session.manufacturer_name,
    accuracy_class: session.accuracy_class,
    capacity_max: session.capacity_max,
    capacity_min: session.capacity_min,
    verification_interval_e: session.verification_interval_e,
    verification_intervals_n: session.verification_intervals_n
  };

  const htmlContent = generateReportHtml({
    report: reportData,
    session,
    instrument: instrumentData,
    environment: envRes.rows[0] || null,
    referenceWeights: weightsRes.rows || [],
    tests: summary.tests,
    qrDataUrl,
    verificationUrl,
    signature
  });

  // 6. Render PDF via Puppeteer
  let browser = null;
  let pdfBuffer = null;
  try {
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync'
      ]
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else if (process.platform === 'win32') {
      const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
      ];
      for (const p of chromePaths) {
        if (fs.existsSync(p)) {
          launchOptions.executablePath = p;
          break;
        }
      }
    } else {
      // In Linux / Render container, attempt puppeteer's resolved executable path
      try {
        const resolvedPath = puppeteer.executablePath();
        if (resolvedPath && fs.existsSync(resolvedPath)) {
          launchOptions.executablePath = resolvedPath;
        }
      } catch (e) {
        console.warn('[PUPPETEER] Default executable resolution notice:', e.message);
      }
    }

    browser = await puppeteer.launch(launchOptions);
    console.log('[PUPPETEER] Chromium instance launched successfully.');

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Generate PDF to in-memory buffer
    pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm'
      }
    });
  } catch (puppeteerErr) {
    console.error('[PUPPETEER ERROR] Failed to render PDF with Puppeteer:', puppeteerErr);
    throw new Error(`PDF generation engine failed: ${puppeteerErr.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // 7. Upload PDF Buffer to Supabase Storage bucket 'reports'
  const uploadResult = await uploadBuffer(
    BUCKETS.REPORTS,
    storagePath,
    pdfBuffer,
    'application/pdf'
  );

  const pdfUrl = uploadResult.publicUrl;
  console.log(`[REPORT STORAGE] PDF certificate uploaded to: ${pdfUrl} (Storage: ${uploadResult.storageType})`);

  // 8. Transaction: Insert reports and qr_codes DB rows only after successful PDF creation
  const client = await pool.connect();
  let createdReport;
  try {
    await client.query('BEGIN');

    if (existingReportId) {
      const updateRes = await client.query(
        `UPDATE reports SET
           pdf_url = $1,
           is_signed = COALESCE($2, is_signed),
           version = version + 1
         WHERE id = $3
         RETURNING *;`,
        [pdfUrl, signature ? true : null, existingReportId]
      );
      createdReport = updateRes.rows[0];
    } else {
      const reportInsertRes = await client.query(
        `INSERT INTO reports (
          session_id, report_number, pdf_url, qr_code, overall_result, generated_by, generated_at, is_signed, version, remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, now(), false, 1, $7)
        RETURNING *;`,
        [
          sessionId,
          reportNumber,
          pdfUrl,
          qrDataUrl,
          summary.overall_result,
          userId || null,
          summary.reason_string
        ]
      );

      createdReport = reportInsertRes.rows[0];

      // Insert qr_codes row
      await client.query(
        `INSERT INTO qr_codes (
          report_id, qr_token, verification_url, is_active, created_at
        ) VALUES ($1, $2, $3, true, now());`,
        [createdReport.id, qrToken, verificationUrl]
      );
    }

    // Update session status to COMPLETED and save overall_result
    await client.query(
      `UPDATE test_sessions SET
        overall_result = $1,
        status = 'COMPLETED',
        completed_at = COALESCE(completed_at, now()),
        remarks = COALESCE(remarks, $2),
        updated_at = now()
      WHERE id = $3;`,
      [summary.overall_result, summary.reason_string, sessionId]
    );

    await client.query('COMMIT');
  } catch (dbErr) {
    await client.query('ROLLBACK');
    // Cleanup generated PDF file on DB failure
    await deleteFile(BUCKETS.REPORTS, storagePath);
    console.error('[REPORT DB ERROR] Failed to commit report record to database:', dbErr);
    throw dbErr;
  } finally {
    client.release();
  }

  // Log audit
  await logAudit({
    userId,
    sessionId,
    action: existingReportId ? 'REGENERATE_REPORT_SIGNED' : 'GENERATE_REPORT',
    entityType: 'reports',
    entityId: createdReport.id,
    newValue: createdReport
  });

  // Notify the session's tester that report is ready
  if (session.tester_id) {
    await notifyUser(
      session.tester_id,
      `Report ${reportNumber} is ready for session ${session.session_number}`,
      'REPORT_READY'
    );
  }

  return {
    report: createdReport,
    download_url: `/api/reports/${reportNumber}/download`
  };
};

export default {
  generateReportNumber,
  generateReportPdf
};
