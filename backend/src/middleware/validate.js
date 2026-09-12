import { fail } from '../utils/apiResponse.js';

/**
 * Zod Request Validation Middleware Factory
 * @param {import('zod').ZodSchema} schema - Zod validation schema
 * @param {'body' | 'query' | 'params'} [source='body'] - Request property to validate
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const parsed = schema.parse(dataToValidate);
      req[source] = parsed; // Replace with sanitized/coerced data
      next();
    } catch (err) {
      const issues = err.issues || err.errors;
      if (Array.isArray(issues) && issues.length > 0) {
        const fieldErrors = issues.map((e) => ({
          field: Array.isArray(e.path) ? e.path.join('.') : (e.path || source),
          message: e.message
        }));

        return fail(res, 'Validation failed', 400, fieldErrors);
      }

      return fail(res, err.message || 'Invalid request data', 400);
    }
  };
};

export default validate;
