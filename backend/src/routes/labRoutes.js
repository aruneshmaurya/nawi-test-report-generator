import { Router } from 'express';
import { getLabs } from '../controllers/authController.js';

const router = Router();

/**
 * @route   GET /api/labs
 * @desc    Get active laboratories for selection
 * @access  Public
 */
router.get('/', getLabs);

export default router;
