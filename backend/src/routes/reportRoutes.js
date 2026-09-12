import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listReports,
  downloadReport,
  signReport,
  signReportSchema
} from '../controllers/reportController.js';

const router = Router();

/**
 * @route   GET /api/reports/:reportNumber/download
 * @desc    Stream/download generated PDF certificate (Public / Iframe embeddable)
 * @access  Public
 */
router.get('/:reportNumber/download', downloadReport);

/**
 * @route   GET /api/reports
 * @desc    List all reports (scoped to user's lab)
 * @access  Private
 */
router.get('/', requireAuth, listReports);

/**
 * @route   POST /api/reports/:reportId/sign
 * @desc    Apply digital signature to report
 * @access  Private
 */
router.post('/:reportId/sign', requireAuth, validate(signReportSchema), signReport);

export default router;
