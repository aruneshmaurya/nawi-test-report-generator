import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';
import {
  uploadAttachment,
  getSessionAttachments,
  deleteAttachment
} from '../controllers/attachmentController.js';

// Router for session-nested attachment routes: /api/sessions/:sessionId/attachments
export const sessionAttachmentRouter = Router({ mergeParams: true });

sessionAttachmentRouter.use(requireAuth);

/**
 * @route   POST /api/sessions/:sessionId/attachments
 * @desc    Upload an attachment file (JPEG, PNG, WEBP, PDF <= 10MB)
 * @access  Private
 */
sessionAttachmentRouter.post('/', uploadSingle('file'), uploadAttachment);

/**
 * @route   GET /api/sessions/:sessionId/attachments
 * @desc    List all attachments for a session, grouped by file_category
 * @access  Private
 */
sessionAttachmentRouter.get('/', getSessionAttachments);

// Router for root attachments operations: /api/attachments
export const rootAttachmentRouter = Router();

rootAttachmentRouter.use(requireAuth);

/**
 * @route   DELETE /api/attachments/:id
 * @desc    Delete attachment by ID (removes DB row & deletes file from disk)
 * @access  Private (Uploader, REVIEWER, LAB_HEAD, ADMIN)
 */
rootAttachmentRouter.delete('/:id', deleteAttachment);

export default {
  sessionAttachmentRouter,
  rootAttachmentRouter
};
