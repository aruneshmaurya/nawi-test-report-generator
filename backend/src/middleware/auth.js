import jwt from 'jsonwebtoken';
import { fail } from '../utils/apiResponse.js';

/**
 * Authentication Middleware
 * Verifies JWT token from Authorization header and attaches decoded payload to req.user
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return fail(res, 'Authentication required. Missing or invalid Authorization header.', 401);
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error('[AUTH ERROR] JWT_SECRET is not configured in environment variables.');
    return fail(res, 'Internal server authentication error.', 500);
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    // Attach decoded user data { id, role, lab_id, ... } to req.user
    req.user = {
      id: decoded.id,
      role: decoded.role,
      lab_id: decoded.lab_id,
      email: decoded.email
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return fail(res, 'Token has expired. Please log in again.', 401);
    }
    return fail(res, 'Invalid or malformed authentication token.', 401);
  }
};

/**
 * Role-Based Access Control Middleware Factory
 * @param  {...string} allowedRoles - Roles permitted to access the route (e.g. 'ADMIN', 'LAB_HEAD', 'REVIEWER', 'TESTER')
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 'Authentication required.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return fail(
        res,
        `Forbidden. Access restricted to roles: [${allowedRoles.join(', ')}]`,
        403,
        { requiredRoles: allowedRoles, currentRole: req.user.role }
      );
    }

    next();
  };
};

export default { requireAuth, requireRole };
