import { z } from 'zod';
import { query } from '../config/db.js';
import { logAudit } from '../services/auditService.js';
import { success, fail } from '../utils/apiResponse.js';

export const manufacturerSchema = z.object({
  name: z.string().trim().min(2, 'Manufacturer name is required and must be at least 2 characters'),
  address: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  contact_person: z.string().trim().optional().nullable(),
  email: z.string().trim().email('Invalid email address').optional().nullable().or(z.literal('')),
  phone: z.string().trim().optional().nullable(),
  website: z.string().trim().optional().nullable()
});

/**
 * List all active manufacturers
 * GET /api/manufacturers
 */
export const getManufacturers = async (req, res) => {
  const result = await query(
    `SELECT id, name, address, country, contact_person, email, phone, website, is_active, created_at, updated_at
     FROM manufacturers
     WHERE is_active = true
     ORDER BY name ASC;`
  );

  return success(res, { manufacturers: result.rows }, 'Manufacturers retrieved successfully');
};

/**
 * Create a new manufacturer (or return existing if matched by name)
 * POST /api/manufacturers
 */
export const createManufacturer = async (req, res) => {
  const { name, address, country, contact_person, email, phone, website } = req.body;

  // Check if manufacturer already exists (case-insensitive)
  const existing = await query(
    `SELECT id, name, address, country, contact_person, email, phone, website, is_active
     FROM manufacturers
     WHERE LOWER(name) = LOWER($1) LIMIT 1;`,
    [name]
  );

  if (existing.rows.length > 0) {
    return success(res, { manufacturer: existing.rows[0] }, 'Manufacturer already exists', 200);
  }

  const insertRes = await query(
    `INSERT INTO manufacturers (name, address, country, contact_person, email, phone, website, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING id, name, address, country, contact_person, email, phone, website, is_active, created_at;`,
    [
      name,
      address || null,
      country || null,
      contact_person || null,
      email || null,
      phone || null,
      website || null
    ]
  );

  const createdMfr = insertRes.rows[0];

  await logAudit({
    userId: req.user?.id || null,
    action: 'CREATE_MANUFACTURER',
    entityType: 'manufacturers',
    entityId: createdMfr.id,
    newValue: createdMfr,
    ipAddress: req.ip
  });

  return success(res, { manufacturer: createdMfr }, 'Manufacturer created successfully', 201);
};

export default {
  getManufacturers,
  createManufacturer,
  manufacturerSchema
};
