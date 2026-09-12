import { z } from 'zod';
import { query } from '../config/db.js';
import { computeVerificationIntervals, checkAccuracyClassPlausibility } from '../services/instrumentService.js';
import { logAudit } from '../services/auditService.js';
import { uploadBuffer, BUCKETS } from '../services/storageService.js';
import { success, fail } from '../utils/apiResponse.js';

export const createInstrumentSchema = z.object({
  manufacturer_id: z.string().uuid('Invalid manufacturer UUID').optional().nullable(),
  manufacturer_name: z.string().trim().min(2, 'Manufacturer name must be at least 2 characters').optional().nullable(),
  model: z.string().trim().min(1, 'Instrument model/type designation is required'),
  serial_number: z.string().trim().min(1, 'Serial number is required'),
  instrument_type: z.enum(['SINGLE_RANGE', 'MULTI_RANGE'], {
    errorMap: () => ({ message: 'Instrument type must be SINGLE_RANGE or MULTI_RANGE' })
  }),
  accuracy_class: z.enum(['I', 'II', 'III', 'IIII'], {
    errorMap: () => ({ message: 'Accuracy class must be one of I, II, III, IIII' })
  }),
  capacity_max: z.coerce.number().positive('Max capacity must be a positive number'),
  capacity_min: z.coerce.number().nonnegative('Min capacity must be non-negative').optional().default(0),
  verification_interval_e: z.coerce.number().positive('Verification scale interval (e) must be positive'),
  actual_interval_d: z.coerce.number().positive('Actual scale interval (d) must be positive').optional().nullable(),
  power_source: z.string().trim().optional().nullable(),
  software_version: z.string().trim().optional().nullable(),
  firmware_version: z.string().trim().optional().nullable(),
  manufacture_date: z.string().optional().nullable()
});

export const updateInstrumentSchema = z.object({
  model: z.string().trim().min(1).optional(),
  accuracy_class: z.enum(['I', 'II', 'III', 'IIII']).optional(),
  capacity_max: z.coerce.number().positive().optional(),
  capacity_min: z.coerce.number().nonnegative().optional(),
  verification_interval_e: z.coerce.number().positive().optional(),
  actual_interval_d: z.coerce.number().positive().optional(),
  power_source: z.string().trim().optional().nullable(),
  software_version: z.string().trim().optional().nullable(),
  firmware_version: z.string().trim().optional().nullable(),
  manufacture_date: z.string().optional().nullable(),
  is_active: z.boolean().optional()
});

/**
 * List and search instruments
 * GET /api/instruments?search=&serial_number=
 */
export const getInstruments = async (req, res) => {
  const { search, serial_number } = req.query;
  let sql = `
    SELECT i.*, m.name AS manufacturer_name, m.country AS manufacturer_country
    FROM instruments i
    LEFT JOIN manufacturers m ON i.manufacturer_id = m.id
    WHERE i.is_active = true
  `;
  const params = [];

  if (serial_number) {
    params.push(serial_number.trim());
    sql += ` AND LOWER(i.serial_number) = LOWER($${params.length})`;
  } else if (search) {
    params.push(`%${search.trim().toLowerCase()}%`);
    sql += ` AND (LOWER(i.model) LIKE $${params.length} OR LOWER(i.serial_number) LIKE $${params.length} OR LOWER(m.name) LIKE $${params.length})`;
  }

  sql += ` ORDER BY i.created_at DESC;`;

  const result = await query(sql, params);
  return success(res, { instruments: result.rows }, 'Instruments retrieved successfully');
};

/**
 * Fetch a single instrument by ID
 * GET /api/instruments/:id
 */
export const getInstrumentById = async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `SELECT i.*, m.name AS manufacturer_name, m.country AS manufacturer_country,
            m.contact_person AS manufacturer_contact, m.email AS manufacturer_email
     FROM instruments i
     LEFT JOIN manufacturers m ON i.manufacturer_id = m.id
     WHERE i.id = $1 LIMIT 1;`,
    [id]
  );

  if (result.rows.length === 0) {
    return fail(res, 'Instrument not found', 404);
  }

  return success(res, { instrument: result.rows[0] }, 'Instrument retrieved successfully');
};

/**
 * Create a new instrument
 * POST /api/instruments
 */
export const createInstrument = async (req, res) => {
  let {
    manufacturer_id,
    manufacturer_name,
    model,
    serial_number,
    instrument_type,
    accuracy_class,
    capacity_max,
    capacity_min,
    verification_interval_e,
    actual_interval_d,
    power_source,
    software_version,
    firmware_version,
    manufacture_date
  } = req.body;

  // 1. Resolve manufacturer: ID or auto-create/lookup by name
  if (!manufacturer_id && manufacturer_name) {
    const existingMfr = await query(
      `SELECT id FROM manufacturers WHERE LOWER(name) = LOWER($1) LIMIT 1;`,
      [manufacturer_name.trim()]
    );
    if (existingMfr.rows.length > 0) {
      manufacturer_id = existingMfr.rows[0].id;
    } else {
      const newMfr = await query(
        `INSERT INTO manufacturers (name, is_active) VALUES ($1, true) RETURNING id;`,
        [manufacturer_name.trim()]
      );
      manufacturer_id = newMfr.rows[0].id;
    }
  }

  if (!manufacturer_id) {
    return fail(res, 'Either manufacturer_id or manufacturer_name must be provided', 400);
  }

  // 2. Check duplicate serial_number
  const dupCheck = await query(
    `SELECT id FROM instruments WHERE LOWER(serial_number) = LOWER($1) LIMIT 1;`,
    [serial_number.trim()]
  );

  if (dupCheck.rows.length > 0) {
    return fail(res, `Instrument with serial number "${serial_number}" already exists`, 409);
  }

  // 3. Compute verification intervals: n = Max / e
  const n = computeVerificationIntervals(capacity_max, verification_interval_e);

  // 4. Validate accuracy class plausibility (non-blocking warning check)
  const warnings = checkAccuracyClassPlausibility(accuracy_class, n);

  // 5. Insert into instruments
  const insertRes = await query(
    `INSERT INTO instruments (
      manufacturer_id, model, serial_number, instrument_type, accuracy_class,
      capacity_max, capacity_min, verification_interval_e, actual_interval_d,
      verification_intervals_n, power_source, software_version, firmware_version,
      manufacture_date, is_active
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12, $13,
      $14, true
    ) RETURNING *;`,
    [
      manufacturer_id,
      model.trim(),
      serial_number.trim(),
      instrument_type,
      accuracy_class,
      capacity_max,
      capacity_min || 0,
      verification_interval_e,
      actual_interval_d || null,
      n,
      power_source || null,
      software_version || null,
      firmware_version || null,
      manufacture_date || null
    ]
  );

  // Fetch joined manufacturer name for response
  const createdInstrument = insertRes.rows[0];
  const mfrInfo = await query('SELECT name FROM manufacturers WHERE id = $1;', [manufacturer_id]);
  createdInstrument.manufacturer_name = mfrInfo.rows[0]?.name || null;

  await logAudit({
    userId: req.user.id,
    action: 'CREATE_INSTRUMENT',
    entityType: 'instruments',
    entityId: createdInstrument.id,
    newValue: createdInstrument,
    ipAddress: req.ip
  });

  return success(
    res,
    {
      instrument: createdInstrument,
      warnings
    },
    'Instrument created successfully',
    201
  );
};

/**
 * Update an instrument
 * PATCH /api/instruments/:id
 */
export const updateInstrument = async (req, res) => {
  const { id } = req.params;

  const currentRes = await query('SELECT * FROM instruments WHERE id = $1 LIMIT 1;', [id]);
  if (currentRes.rows.length === 0) {
    return fail(res, 'Instrument not found', 404);
  }

  const current = currentRes.rows[0];
  const updates = req.body;

  const capacity_max = updates.capacity_max !== undefined ? updates.capacity_max : current.capacity_max;
  const verification_interval_e =
    updates.verification_interval_e !== undefined
      ? updates.verification_interval_e
      : current.verification_interval_e;
  const accuracy_class = updates.accuracy_class !== undefined ? updates.accuracy_class : current.accuracy_class;

  const n = computeVerificationIntervals(capacity_max, verification_interval_e);
  const warnings = checkAccuracyClassPlausibility(accuracy_class, n);

  const updateRes = await query(
    `UPDATE instruments SET
      model = COALESCE($1, model),
      accuracy_class = COALESCE($2, accuracy_class),
      capacity_max = COALESCE($3, capacity_max),
      capacity_min = COALESCE($4, capacity_min),
      verification_interval_e = COALESCE($5, verification_interval_e),
      actual_interval_d = COALESCE($6, actual_interval_d),
      verification_intervals_n = $7,
      power_source = COALESCE($8, power_source),
      software_version = COALESCE($9, software_version),
      firmware_version = COALESCE($10, firmware_version),
      manufacture_date = COALESCE($11, manufacture_date),
      is_active = COALESCE($12, is_active),
      updated_at = now()
    WHERE id = $13
    RETURNING *;`,
    [
      updates.model,
      updates.accuracy_class,
      updates.capacity_max,
      updates.capacity_min,
      updates.verification_interval_e,
      updates.actual_interval_d,
      n,
      updates.power_source,
      updates.software_version,
      updates.firmware_version,
      updates.manufacture_date,
      updates.is_active,
      id
    ]
  );

  const updatedInstrument = updateRes.rows[0];

  await logAudit({
    userId: req.user.id,
    action: 'UPDATE_INSTRUMENT',
    entityType: 'instruments',
    entityId: id,
    oldValue: current,
    newValue: updatedInstrument,
    ipAddress: req.ip
  });

  return success(
    res,
    {
      instrument: updatedInstrument,
      warnings
    },
    'Instrument updated successfully'
  );
};

/**
 * Upload photos for an instrument (nameplate_photo and/or instrument_photo)
 * POST /api/instruments/:id/photos
 */
export const uploadPhotos = async (req, res) => {
  const { id } = req.params;

  const instrumentCheck = await query('SELECT id FROM instruments WHERE id = $1 LIMIT 1;', [id]);
  if (instrumentCheck.rows.length === 0) {
    return fail(res, 'Instrument not found', 404);
  }

  const files = req.files || {};
  const nameplatePhoto = files.nameplate_photo?.[0];
  const instrumentPhoto = files.instrument_photo?.[0];

  if (!nameplatePhoto && !instrumentPhoto) {
    return fail(res, 'At least one photo (nameplate_photo or instrument_photo) must be uploaded', 400);
  }

  let nameplatePath = null;
  let instrumentPath = null;

  if (nameplatePhoto) {
    const ext = nameplatePhoto.originalname.includes('.')
      ? `.${nameplatePhoto.originalname.split('.').pop().toLowerCase()}`
      : '.jpg';
    const upRes = await uploadBuffer(
      BUCKETS.ATTACHMENTS,
      `instruments/${id}/nameplate-${Date.now()}${ext}`,
      nameplatePhoto.buffer,
      nameplatePhoto.mimetype
    );
    nameplatePath = upRes.publicUrl;
  }

  if (instrumentPhoto) {
    const ext = instrumentPhoto.originalname.includes('.')
      ? `.${instrumentPhoto.originalname.split('.').pop().toLowerCase()}`
      : '.jpg';
    const upRes = await uploadBuffer(
      BUCKETS.ATTACHMENTS,
      `instruments/${id}/instrument-${Date.now()}${ext}`,
      instrumentPhoto.buffer,
      instrumentPhoto.mimetype
    );
    instrumentPath = upRes.publicUrl;
  }

  const updateRes = await query(
    `UPDATE instruments SET
      nameplate_photo = COALESCE($1, nameplate_photo),
      instrument_photo = COALESCE($2, instrument_photo),
      updated_at = now()
    WHERE id = $3
    RETURNING id, model, serial_number, nameplate_photo, instrument_photo;`,
    [nameplatePath, instrumentPath, id]
  );

  await logAudit({
    userId: req.user.id,
    action: 'UPLOAD_INSTRUMENT_PHOTOS',
    entityType: 'instruments',
    entityId: id,
    newValue: updateRes.rows[0],
    ipAddress: req.ip
  });

  return success(res, { instrument: updateRes.rows[0] }, 'Instrument photos uploaded successfully');
};

export default {
  getInstruments,
  getInstrumentById,
  createInstrument,
  updateInstrument,
  uploadPhotos
};
