import { Router } from 'express';
import { verifyReport } from '../controllers/reportController.js';

const router = Router();

/**
 * @route   GET /api/verify/:reportNumber
 * @desc    Public QR verification landing endpoint (Zero auth, minimal public metadata)
 * @access  Public
 */
router.get('/:reportNumber', verifyReport);

export default router;
