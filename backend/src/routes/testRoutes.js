import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  getOrCreateTest,
  addTestReading,
  getSessionTests,
  deleteTestReading,
  createTestSchema
} from '../controllers/testController.js';

const router = Router({ mergeParams: true });

// Protect all test endpoints
router.use(requireAuth);

/**
 * @route   POST /api/sessions/:sessionId/tests
 * @desc    Get or create test record (Idempotent)
 * @access  Private
 */
router.post('/', validate(createTestSchema), getOrCreateTest);

/**
 * @route   GET /api/sessions/:sessionId/tests
 * @desc    Get all tests for a session with nested readings and computed results
 * @access  Private
 */
router.get('/', getSessionTests);

/**
 * @route   POST /api/sessions/:sessionId/tests/:testId/readings
 * @desc    Add and immediately evaluate a test reading
 * @access  Private
 */
router.post('/:testId/readings', addTestReading);

/**
 * @route   DELETE /api/sessions/:sessionId/tests/:testId/readings/:readingId
 * @desc    Remove a mis-entered reading before session is completed/approved
 * @access  Private
 */
router.delete('/:testId/readings/:readingId', deleteTestReading);

export default router;
