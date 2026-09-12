import { z } from 'zod';
import { query } from '../config/db.js';
import { hashPassword, comparePassword, generateToken } from '../services/authService.js';
import { logAudit } from '../services/auditService.js';
import { success, fail } from '../utils/apiResponse.js';

// 1. Validation Schemas
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long'),
  email: z.string().trim().email('Invalid email address format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/\d/, 'Password must contain at least one number'),
  role: z.enum(['ADMIN', 'TESTER', 'REVIEWER', 'LAB_HEAD'], {
    errorMap: () => ({ message: 'Role must be one of ADMIN, TESTER, REVIEWER, LAB_HEAD' })
  }),
  lab_id: z.string().uuid('Invalid laboratory UUID').optional().nullable()
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
  lab_id: z.string().uuid('Invalid laboratory UUID')
});

/**
 * Register a new user (ADMIN only)
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  const { name, email, password, role, lab_id } = req.body;

  // Check duplicate email
  const existingUser = await query('SELECT id FROM users WHERE email = $1 LIMIT 1;', [email]);
  if (existingUser.rows.length > 0) {
    return fail(res, 'Email already registered', 409);
  }

  // Validate laboratory if provided
  if (lab_id) {
    const labCheck = await query('SELECT id FROM laboratories WHERE id = $1 LIMIT 1;', [lab_id]);
    if (labCheck.rows.length === 0) {
      return fail(res, 'Specified laboratory does not exist', 400);
    }
  }

  // Hash password with bcrypt (12 rounds)
  const passwordHash = await hashPassword(password);

  const insertRes = await query(
    `INSERT INTO users (name, email, password_hash, role, lab_id, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING id, name, email, role, lab_id, is_active, created_at;`,
    [name, email, passwordHash, role, lab_id || null]
  );

  const newUser = insertRes.rows[0];

  await logAudit({
    userId: req.user.id,
    action: 'REGISTER_USER',
    entityType: 'users',
    entityId: newUser.id,
    newValue: { name: newUser.name, email: newUser.email, role: newUser.role, lab_id: newUser.lab_id },
    ipAddress: req.ip
  });

  return success(res, { user: newUser }, 'User registered successfully', 201);
};

/**
 * User login
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  const { email, password, lab_id } = req.body;
  const GENERIC_ERROR_MSG = 'Invalid email, password, or lab';

  // Look up user by email and lab_id
  const userRes = await query(
    `SELECT id, name, email, role, lab_id, password_hash, is_active 
     FROM users 
     WHERE email = $1 AND lab_id = $2 LIMIT 1;`,
    [email, lab_id]
  );

  if (userRes.rows.length === 0) {
    return fail(res, GENERIC_ERROR_MSG, 401);
  }

  const user = userRes.rows[0];

  if (!user.is_active) {
    return fail(res, 'Account is deactivated. Please contact your lab administrator.', 403);
  }

  // Verify password with bcrypt
  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    return fail(res, GENERIC_ERROR_MSG, 401);
  }

  // Issue JWT signed with JWT_SECRET
  const token = generateToken({
    id: user.id,
    role: user.role,
    lab_id: user.lab_id,
    email: user.email
  });

  await logAudit({
    userId: user.id,
    action: 'LOGIN',
    entityType: 'users',
    entityId: user.id,
    ipAddress: req.ip
  });

  return success(
    res,
    {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        lab_id: user.lab_id
      }
    },
    'Login successful'
  );
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
  const userId = req.user.id;

  const result = await query(
    `SELECT u.id, u.name, u.email, u.role, u.lab_id, u.is_active, u.created_at,
            l.name AS lab_name, l.registration_no AS lab_registration_no, l.address AS lab_address
     FROM users u
     LEFT JOIN laboratories l ON u.lab_id = l.id
     WHERE u.id = $1 LIMIT 1;`,
    [userId]
  );

  if (result.rows.length === 0) {
    return fail(res, 'User profile not found', 404);
  }

  return success(res, { user: result.rows[0] }, 'User profile retrieved');
};

/**
 * Get list of active laboratories (Public)
 * GET /api/labs
 */
export const getLabs = async (req, res) => {
  const result = await query(
    `SELECT id, name, registration_no, city, address
     FROM (
       SELECT id, name, registration_no, address, NULL as city
       FROM laboratories
       WHERE is_active = true
     ) t
     ORDER BY name ASC;`
  );

  return success(res, { laboratories: result.rows }, 'Laboratories retrieved successfully');
};

export default {
  register,
  login,
  getMe,
  getLabs
};
