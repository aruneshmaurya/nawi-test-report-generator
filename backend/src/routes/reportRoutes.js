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

router.use(requireAuth);

/**
 * @route   GET /api/reports
 * @desc    List all reports (scoped to user's lab)
 * @access  Private
 */
router.get('/', listReports);

/**
 * @route   GET /api/reports/:reportNumber/download
 * @desc    Stream/download generated PDF certificate
 * @access  Private (Scoped to same lab or ADMIN)
 */
router.get('/:reportNumber/download', downloadReport);

/**
 * @route   POST /api/reports/:reportId/sign
 * @desc    Apply digital signature to report
 * @access  Private
 */
router.post('/:reportId/sign', validate(signReportSchema), signReport);

export default router;
