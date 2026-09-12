import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadFields } from '../middleware/upload.js';
import {
  getInstruments,
  getInstrumentById,
  createInstrument,
  createInstrumentSchema,
  updateInstrument,
  updateInstrumentSchema,
  uploadPhotos
} from '../controllers/instrumentController.js';

const router = Router();

// Protect all instrument endpoints
router.use(requireAuth);

/**
 * @route   GET /api/instruments
 * @desc    List / search instruments (search or serial_number query)
 * @access  Private
 */
router.get('/', getInstruments);

/**
 * @route   GET /api/instruments/:id
 * @desc    Get instrument details with manufacturer info
 * @access  Private
 */
router.get('/:id', getInstrumentById);

/**
 * @route   POST /api/instruments
 * @desc    Create a new instrument (calculates n and validates accuracy class)
 * @access  Private
 */
router.post('/', validate(createInstrumentSchema), createInstrument);

/**
 * @route   PATCH /api/instruments/:id
 * @desc    Update an instrument
 * @access  Private
 */
router.patch('/:id', validate(updateInstrumentSchema), updateInstrument);

/**
 * @route   POST /api/instruments/:id/photos
 * @desc    Upload nameplate and instrument photos
 * @access  Private
 */
router.post(
  '/:id/photos',
  uploadFields([
    { name: 'nameplate_photo', maxCount: 1 },
    { name: 'instrument_photo', maxCount: 1 }
  ]),
  uploadPhotos
);

export default router;
