import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import testRoutes from './testRoutes.js';
import { sessionAttachmentRouter } from './attachmentRoutes.js';
import {
  createSession,
  createSessionSchema,
  upsertEnvironment,
  environmentSchema,
  addReferenceWeights,
  referenceWeightsSchema,
  getSessionById,
  getSessions,
  updateSessionStatus,
  updateStatusSchema
} from '../controllers/sessionController.js';
import {
  getSessionSummary,
  updateSessionRemarks,
  updateRemarksSchema,
  createSessionReport,
  getSessionReport
} from '../controllers/reportController.js';

const router = Router();

// Protect all session endpoints
router.use(requireAuth);

/**
 * @route   POST /api/sessions
 * @desc    Create a new test session (Tester ID & Lab ID auto-filled from auth token)
 * @access  Private
 */
router.post('/', validate(createSessionSchema), createSession);

/**
 * @route   GET /api/sessions
 * @desc    List test sessions (scoped to user's lab unless Admin)
 * @access  Private
 */
router.get('/', getSessions);

/**
 * @route   GET /api/sessions/:id
 * @desc    Fetch full session with instrument, environment, and reference weights
 * @access  Private
 */
router.get('/:id', getSessionById);

/**
 * @route   PATCH /api/sessions/:id/environment
 * @desc    Upsert environmental conditions for the session
 * @access  Private
 */
router.patch('/:id/environment', validate(environmentSchema), upsertEnvironment);

/**
 * @route   POST /api/sessions/:id/reference-weights
 * @desc    Add one or more reference weights to the session
 * @access  Private
 */
router.post('/:id/reference-weights', validate(referenceWeightsSchema), addReferenceWeights);

/**
 * @route   PATCH /api/sessions/:id/status
 * @desc    Update session status (Forward transitions only; APPROVED restricted to REVIEWER/LAB_HEAD/ADMIN)
 * @access  Private
 */
router.patch('/:id/status', validate(updateStatusSchema), updateSessionStatus);

/**
 * @route   GET /api/sessions/:sessionId/summary
 * @desc    Get aggregated test summary across all four tests (supports ?finalize=true)
 * @access  Private
 */
router.get('/:sessionId/summary', getSessionSummary);

/**
 * @route   PATCH /api/sessions/:sessionId/remarks
 * @desc    Save free-text remarks and reviewer name
 * @access  Private
 */
router.patch('/:sessionId/remarks', validate(updateRemarksSchema), updateSessionRemarks);

/**
 * @route   GET /api/sessions/:sessionId/report
 * @desc    Get generated certificate report for a session
 * @access  Private
 */
router.get('/:sessionId/report', getSessionReport);

/**
 * @route   POST /api/sessions/:sessionId/reports
 * @desc    Generate PDF certificate with QR code and persist report
 * @access  Private
 */
router.post('/:sessionId/reports', createSessionReport);

// Mount nested test endpoints: /api/sessions/:sessionId/tests
router.use('/:sessionId/tests', testRoutes);

// Mount nested attachment endpoints: /api/sessions/:sessionId/attachments
router.use('/:sessionId/attachments', sessionAttachmentRouter);

export default router;
