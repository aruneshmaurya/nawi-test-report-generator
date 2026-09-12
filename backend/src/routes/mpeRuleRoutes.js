import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getMpeRules } from '../controllers/mpeRuleController.js';

const router = Router();

/**
 * @route   GET /api/mpe-rules
 * @desc    List raw OIML MPE rules
 * @access  Private (ADMIN, LAB_HEAD)
 */
router.get('/', requireAuth, requireRole('ADMIN', 'LAB_HEAD'), getMpeRules);

export default router;
