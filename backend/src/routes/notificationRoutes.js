import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getNotifications, markAsRead } from '../controllers/notificationController.js';

const router = Router();

router.use(requireAuth);

/**
 * @route   GET /api/notifications
 * @desc    Get authenticated user's notifications newest-first
 * @access  Private
 */
router.get('/', getNotifications);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch('/:id/read', markAsRead);

export default router;
