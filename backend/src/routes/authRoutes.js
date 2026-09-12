import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  register,
  registerSchema,
  login,
  loginSchema,
  getMe
} from '../controllers/authController.js';

const router = Router();

// Stricter rate limiter for login endpoint (10 attempts / 15 minutes per IP)
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
  }
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Private (ADMIN only)
 */
router.post('/register', requireAuth, requireRole('ADMIN'), validate(registerSchema), register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public (Rate limited: max 10 per 15 min)
 */
router.post('/login', loginRateLimiter, validate(loginSchema), login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private (Authenticated users)
 */
router.get('/me', requireAuth, getMe);

export default router;
