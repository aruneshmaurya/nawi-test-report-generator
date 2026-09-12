import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  getManufacturers,
  createManufacturer,
  manufacturerSchema
} from '../controllers/manufacturerController.js';

const router = Router();

// Protect all manufacturer endpoints
router.use(requireAuth);

/**
 * @route   GET /api/manufacturers
 * @desc    List active manufacturers
 * @access  Private
 */
router.get('/', getManufacturers);

/**
 * @route   POST /api/manufacturers
 * @desc    Create a new manufacturer (or get existing by name)
 * @access  Private
 */
router.post('/', validate(manufacturerSchema), createManufacturer);

export default router;
