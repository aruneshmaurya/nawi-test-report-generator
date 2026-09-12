import { z } from 'zod';
import { query } from '../config/db.js';
import { logAudit } from '../services/auditService.js';
import { uploadBuffer, deleteFile, BUCKETS } from '../services/storageService.js';
import { success, fail } from '../utils/apiResponse.js';

export const ALLOWED_CATEGORIES = [
  'INSTRUMENT_PHOTO',
  'NAMEPLATE',
  'CERTIFICATE',
  'TEST_PHOTO',
  'OTHER'
];

export const fileCategorySchema = z.enum(
  ['INSTRUMENT_PHOTO', 'NAMEPLATE', 'CERTIFICATE', 'TEST_PHOTO', 'OTHER'],
  {
    errorMap: () => ({
      message: `file_category must be one of: [${ALLOWED_CATEGORIES.join(', ')}]`
    })
  }
);

/**
 * Upload an attachment for a test session
 * POST /api/sessions/:sessionId/attachments
 */
export const uploadAttachment = async (req, res) => {
  const { sessionId } = req.params;
  const { file_category } = req.body;

  if (!req.file) {
    return fail(res, 'No file was uploaded. Please attach a file under the "file" form field.', 400);
  }

  // Validate file_category
  const categoryParsed = fileCategorySchema.safeParse(file_category);
  if (!categoryParsed.success) {
    return fail(res, categoryParsed.error.issues[0]?.message || 'Invalid file_category', 400);
  }

  // Check session existence and lab scoping
  const sessionRes = await query(
    `SELECT id, lab_id, status FROM test_sessions WHERE id = $1 LIMIT 1;`,
    [sessionId]
  );
  if (sessionRes.rows.length === 0) {
    return fail(res, 'Test session not found', 404);
  }

  const session = sessionRes.rows[0];
  if (req.user.role !== 'ADMIN' && session.lab_id !== req.user.lab_id) {
    return fail(res, 'Forbidden. You cannot add attachments to another laboratory’s session.', 403);
  }

  // Generate unique file path
  const ext = req.file.originalname.includes('.')
    ? `.${req.file.originalname.split('.').pop().toLowerCase()}`
    : '';
  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const storagePath = `sessions/${sessionId}/${uniqueName}`;

  // Upload to Supabase Storage bucket 'attachments'
  const uploadResult = await uploadBuffer(
    BUCKETS.ATTACHMENTS,
    storagePath,
    req.file.buffer,
    req.file.mimetype
  );

  const fileUrl = uploadResult.publicUrl;

  // Insert into attachments table
  const insertRes = await query(
    `INSERT INTO attachments (
      session_id, file_type, file_name, file_url, file_category, uploaded_by, uploaded_at
    ) VALUES ($1, $2, $3, $4, $5, $6, now())
    RETURNING *;`,
    [
      sessionId,
      req.file.mimetype,
      req.file.originalname,
      fileUrl,
      categoryParsed.data,
      req.user.id
    ]
  );

  const newAttachment = insertRes.rows[0];

  await logAudit({
    userId: req.user.id,
    sessionId,
    action: 'UPLOAD_ATTACHMENT',
    entityType: 'attachments',
    entityId: newAttachment.id,
    newValue: newAttachment,
    ipAddress: req.ip
  });

  return success(res, { attachment: newAttachment }, 'Attachment uploaded successfully', 201);
};

/**
 * List all attachments for a session, grouped by file_category
 * GET /api/sessions/:sessionId/attachments
 */
export const getSessionAttachments = async (req, res) => {
  const { sessionId } = req.params;

  const sessionRes = await query(
    `SELECT id, lab_id FROM test_sessions WHERE id = $1 LIMIT 1;`,
    [sessionId]
  );
  if (sessionRes.rows.length === 0) {
    return fail(res, 'Test session not found', 404);
  }

  const session = sessionRes.rows[0];
  if (req.user.role !== 'ADMIN' && session.lab_id !== req.user.lab_id) {
    return fail(res, 'Forbidden. You do not have access to attachments for this laboratory.', 403);
  }

  const attachmentsRes = await query(
    `SELECT a.*, u.name AS uploaded_by_name, u.email AS uploaded_by_email
     FROM attachments a
     LEFT JOIN users u ON a.uploaded_by = u.id
     WHERE a.session_id = $1
     ORDER BY a.uploaded_at ASC;`,
    [sessionId]
  );

  const attachments = attachmentsRes.rows;

  // Group by category for frontend thumbnail gallery rendering
  const grouped = {
    INSTRUMENT_PHOTO: [],
    NAMEPLATE: [],
    CERTIFICATE: [],
    TEST_PHOTO: [],
    OTHER: []
  };

  attachments.forEach((att) => {
    const cat = att.file_category || 'OTHER';
    if (!grouped[cat]) {
      grouped[cat] = [];
    }
    grouped[cat].push(att);
  });

  return success(
    res,
    {
      attachments,
      grouped
    },
    'Attachments retrieved successfully'
  );
};

/**
 * Delete an attachment (Uploader, REVIEWER, LAB_HEAD, or ADMIN) and remove file from disk
 * DELETE /api/attachments/:id
 */
export const deleteAttachment = async (req, res) => {
  const { id } = req.params;

  // Fetch attachment with session details for authorization
  const attRes = await query(
    `SELECT a.*, s.lab_id
     FROM attachments a
     JOIN test_sessions s ON a.session_id = s.id
     WHERE a.id = $1 LIMIT 1;`,
    [id]
  );

  if (attRes.rows.length === 0) {
    return fail(res, 'Attachment not found', 404);
  }

  const attachment = attRes.rows[0];

  // Scoping check: Lab isolation
  if (req.user.role !== 'ADMIN' && attachment.lab_id !== req.user.lab_id) {
    return fail(res, 'Forbidden. You cannot delete attachments from another laboratory.', 403);
  }

  // Permission check: uploader or REVIEWER/LAB_HEAD/ADMIN
  const isUploader = attachment.uploaded_by === req.user.id;
  const isPrivileged = ['ADMIN', 'REVIEWER', 'LAB_HEAD'].includes(req.user.role);

  if (!isUploader && !isPrivileged) {
    return fail(res, 'Forbidden. Only the uploader or a Reviewer/Admin can delete this attachment.', 403);
  }

  // Delete DB row
  await query(`DELETE FROM attachments WHERE id = $1;`, [id]);

  // Remove file from storage
  if (attachment.file_url) {
    await deleteFile(BUCKETS.ATTACHMENTS, attachment.file_url);
  }

  await logAudit({
    userId: req.user.id,
    sessionId: attachment.session_id,
    action: 'DELETE_ATTACHMENT',
    entityType: 'attachments',
    entityId: id,
    oldValue: attachment,
    ipAddress: req.ip
  });

  return success(res, { id }, 'Attachment removed from database and disk successfully');
};

export default {
  uploadAttachment,
  getSessionAttachments,
  deleteAttachment,
  ALLOWED_CATEGORIES
};
