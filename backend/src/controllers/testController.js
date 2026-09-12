import { z } from 'zod';
import { query } from '../config/db.js';
import {
  getApplicableMPE,
  evaluateReading,
  evaluateSpread,
  evaluateDiscrimination
} from '../services/mpeService.js';
import { logAudit } from '../services/auditService.js';
import { success, fail } from '../utils/apiResponse.js';

// 1. Zod Validation Schemas

export const createTestSchema = z.object({
  test_type_code: z.enum(['ACCURACY', 'ECCENTRICITY', 'REPEATABILITY', 'DISCRIMINATION'], {
    errorMap: () => ({
      message: 'test_type_code must be one of ACCURACY, ECCENTRICITY, REPEATABILITY, DISCRIMINATION'
    })
  })
});

const accuracyReadingSchema = z.object({
  load_point: z.coerce.number().optional().nullable(),
  standard_value: z.coerce.number().positive('Standard weight must be a positive number'),
  indicated_value: z.coerce.number().nonnegative('Indicated value must be non-negative')
});

const eccentricityReadingSchema = z.object({
  position: z.enum(['CENTRE', 'FRONT_LEFT', 'FRONT_RIGHT', 'BACK_LEFT', 'BACK_RIGHT'], {
    errorMap: () => ({
      message: 'Position must be one of CENTRE, FRONT_LEFT, FRONT_RIGHT, BACK_LEFT, BACK_RIGHT'
    })
  }),
  standard_value: z.coerce.number().positive('Standard weight must be a positive number'),
  indicated_value: z.coerce.number().nonnegative('Indicated value must be non-negative')
});

const repeatabilityReadingSchema = z.object({
  load_value: z.coerce.number().positive('Load value must be a positive number'),
  indicated_values: z
    .array(z.coerce.number().nonnegative('Indicated value must be non-negative'))
    .min(3, 'Repeatability requires at least 3 indicated values')
});

const discriminationReadingSchema = z.object({
  base_load: z.coerce.number().positive('Base load must be a positive number'),
  added_weight: z.coerce.number().positive('Added weight must be a positive number'),
  indicated_before: z.coerce.number().nonnegative('Indicated before must be non-negative'),
  indicated_after: z.coerce.number().nonnegative('Indicated after must be non-negative'),
  display_changed: z.boolean({
    required_error: 'display_changed boolean is required'
  })
});

/**
 * Helper to fetch session with instrument parameters
 */
const getSessionAndInstrument = async (sessionId) => {
  const res = await query(
    `SELECT s.id, s.session_number, s.verification_type, s.status, s.lab_id,
            i.id AS instrument_id, i.accuracy_class, i.capacity_max, i.capacity_min,
            i.verification_interval_e, i.actual_interval_d
     FROM test_sessions s
     JOIN instruments i ON s.instrument_id = i.id
     WHERE s.id = $1 LIMIT 1;`,
    [sessionId]
  );
  return res.rows[0] || null;
};

/**
 * Get or create a test record for a session (Idempotent)
 * POST /api/sessions/:sessionId/tests
 */
export const getOrCreateTest = async (req, res) => {
  const { sessionId } = req.params;
  const { test_type_code } = req.body;

  const session = await getSessionAndInstrument(sessionId);
  if (!session) {
    return fail(res, 'Test session not found', 404);
  }

  // Look up test_types row
  const typeRes = await query(`SELECT * FROM test_types WHERE UPPER(code) = $1 LIMIT 1;`, [
    test_type_code.toUpperCase()
  ]);
  if (typeRes.rows.length === 0) {
    return fail(res, `Invalid test type code: ${test_type_code}`, 400);
  }

  const testType = typeRes.rows[0];

  // Check if test already exists for this session
  const existingTest = await query(
    `SELECT t.*, tt.code AS test_type_code, tt.name AS test_type_name
     FROM tests t
     JOIN test_types tt ON t.test_type_id = tt.id
     WHERE t.session_id = $1 AND t.test_type_id = $2 LIMIT 1;`,
    [sessionId, testType.id]
  );

  if (existingTest.rows.length > 0) {
    return success(res, { test: existingTest.rows[0] }, 'Test retrieved successfully', 200);
  }

  // Create new test
  const insertRes = await query(
    `INSERT INTO tests (session_id, test_type_id, title)
     VALUES ($1, $2, $3)
     RETURNING *;`,
    [sessionId, testType.id, testType.name]
  );

  const createdTest = insertRes.rows[0];
  createdTest.test_type_code = testType.code;
  createdTest.test_type_name = testType.name;

  // If session is still in DRAFT, move to IN_PROGRESS
  if (session.status === 'DRAFT') {
    await query(`UPDATE test_sessions SET status = 'IN_PROGRESS', updated_at = now() WHERE id = $1;`, [sessionId]);
  }

  await logAudit({
    userId: req.user.id,
    sessionId,
    action: 'CREATE_TEST',
    entityType: 'tests',
    entityId: createdTest.id,
    newValue: createdTest,
    ipAddress: req.ip
  });

  return success(res, { test: createdTest }, 'Test created successfully', 201);
};

/**
 * Add a reading to a specific test
 * POST /api/sessions/:sessionId/tests/:testId/readings
 */
export const addTestReading = async (req, res) => {
  const { sessionId, testId } = req.params;

  const session = await getSessionAndInstrument(sessionId);
  if (!session) {
    return fail(res, 'Test session not found', 404);
  }

  if (session.status === 'COMPLETED' || session.status === 'APPROVED') {
    return fail(res, `Cannot add readings to a ${session.status} session`, 400);
  }

  // Fetch test and test type
  const testRes = await query(
    `SELECT t.*, tt.code AS test_type_code
     FROM tests t
     JOIN test_types tt ON t.test_type_id = tt.id
     WHERE t.id = $1 AND t.session_id = $2 LIMIT 1;`,
    [testId, sessionId]
  );

  if (testRes.rows.length === 0) {
    return fail(res, 'Test not found for this session', 404);
  }

  const test = testRes.rows[0];
  const typeCode = test.test_type_code;

  let validatedBody;
  let standard_value = null;
  let indicated_value = null;
  let error = null;
  let mpe = null;
  let result = null;
  let position = null;
  let extra_data = null;
  let reading_no = 1;

  // Calculate next reading_no
  const countRes = await query(`SELECT COALESCE(MAX(reading_no), 0) + 1 AS next_no FROM test_readings WHERE test_id = $1;`, [testId]);
  reading_no = parseInt(countRes.rows[0].next_no, 10);

  // Dispatch per test_type_code
  switch (typeCode) {
    case 'ACCURACY': {
      const parsed = accuracyReadingSchema.safeParse(req.body);
      if (!parsed.success) {
        return fail(res, 'Validation failed', 400, parsed.error.issues);
      }
      validatedBody = parsed.data;

      // Resolve MPE for standard_value
      const mpeInfo = await getApplicableMPE({
        accuracyClass: session.accuracy_class,
        verificationType: session.verification_type,
        loadValue: validatedBody.standard_value,
        e: session.verification_interval_e
      });

      const evaluation = evaluateReading({
        indicatedValue: validatedBody.indicated_value,
        standardValue: validatedBody.standard_value,
        mpe: mpeInfo.mpe
      });

      standard_value = validatedBody.standard_value;
      indicated_value = validatedBody.indicated_value;
      error = evaluation.error;
      mpe = mpeInfo.mpe;
      result = evaluation.result;
      extra_data = {
        load_point: validatedBody.load_point || null,
        mpe_multiplier: mpeInfo.multiplier,
        formula: mpeInfo.formula
      };
      break;
    }

    case 'ECCENTRICITY': {
      const parsed = eccentricityReadingSchema.safeParse(req.body);
      if (!parsed.success) {
        return fail(res, 'Validation failed', 400, parsed.error.issues);
      }
      validatedBody = parsed.data;

      const mpeInfo = await getApplicableMPE({
        accuracyClass: session.accuracy_class,
        verificationType: session.verification_type,
        loadValue: validatedBody.standard_value,
        e: session.verification_interval_e
      });

      const evaluation = evaluateReading({
        indicatedValue: validatedBody.indicated_value,
        standardValue: validatedBody.standard_value,
        mpe: mpeInfo.mpe
      });

      standard_value = validatedBody.standard_value;
      indicated_value = validatedBody.indicated_value;
      position = validatedBody.position;
      error = evaluation.error;
      mpe = mpeInfo.mpe;
      result = evaluation.result;
      extra_data = {
        mpe_multiplier: mpeInfo.multiplier,
        formula: mpeInfo.formula
      };
      break;
    }

    case 'REPEATABILITY': {
      const parsed = repeatabilityReadingSchema.safeParse(req.body);
      if (!parsed.success) {
        return fail(res, 'Validation failed', 400, parsed.error.issues);
      }
      validatedBody = parsed.data;

      const mpeInfo = await getApplicableMPE({
        accuracyClass: session.accuracy_class,
        verificationType: session.verification_type,
        loadValue: validatedBody.load_value,
        e: session.verification_interval_e
      });

      const evaluation = evaluateSpread({
        indicatedValues: validatedBody.indicated_values,
        mpe: mpeInfo.mpe
      });

      standard_value = validatedBody.load_value;
      indicated_value = validatedBody.indicated_values[0]; // first trial indicator
      error = evaluation.spread; // spread stored as error
      mpe = mpeInfo.mpe;
      result = evaluation.result;
      extra_data = {
        load_value: validatedBody.load_value,
        indicated_values: validatedBody.indicated_values,
        spread: evaluation.spread,
        mpe_multiplier: mpeInfo.multiplier,
        formula: mpeInfo.formula
      };
      break;
    }

    case 'DISCRIMINATION': {
      const parsed = discriminationReadingSchema.safeParse(req.body);
      if (!parsed.success) {
        return fail(res, 'Validation failed', 400, parsed.error.issues);
      }
      validatedBody = parsed.data;

      const evaluation = evaluateDiscrimination({
        displayChanged: validatedBody.display_changed
      });

      standard_value = validatedBody.base_load;
      indicated_value = validatedBody.indicated_after;
      result = evaluation.result;
      extra_data = {
        base_load: validatedBody.base_load,
        added_weight: validatedBody.added_weight,
        indicated_before: validatedBody.indicated_before,
        indicated_after: validatedBody.indicated_after,
        display_changed: validatedBody.display_changed
      };
      break;
    }

    default:
      return fail(res, `Unhandled test type: ${typeCode}`, 400);
  }

  // Insert reading into test_readings table
  const insertRes = await query(
    `INSERT INTO test_readings (
      test_id, reading_no, standard_value, indicated_value, error, mpe, result, position, extra_data
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;`,
    [testId, reading_no, standard_value, indicated_value, error, mpe, result, position, extra_data ? JSON.stringify(extra_data) : null]
  );

  const insertedReading = insertRes.rows[0];

  await logAudit({
    userId: req.user.id,
    sessionId,
    action: 'ADD_READING',
    entityType: 'test_readings',
    entityId: insertedReading.id,
    newValue: insertedReading,
    ipAddress: req.ip
  });

  return success(
    res,
    {
      reading: insertedReading,
      test_type_code: typeCode,
      error,
      mpe,
      result
    },
    'Reading evaluated and recorded successfully',
    201
  );
};

/**
 * Return all four tests for a session with their readings nested and computed overall per-test results
 * GET /api/sessions/:sessionId/tests
 */
export const getSessionTests = async (req, res) => {
  const { sessionId } = req.params;

  const session = await getSessionAndInstrument(sessionId);
  if (!session) {
    return fail(res, 'Test session not found', 404);
  }

  // Fetch all tests with test_type info
  const testsRes = await query(
    `SELECT t.*, tt.code AS test_type_code, tt.name AS test_type_name, tt.display_order
     FROM tests t
     JOIN test_types tt ON t.test_type_id = tt.id
     WHERE t.session_id = $1
     ORDER BY tt.display_order ASC;`,
    [sessionId]
  );

  const tests = testsRes.rows;

  // Fetch all readings for these tests
  const testIds = tests.map((t) => t.id);
  let readingsByTestId = {};

  if (testIds.length > 0) {
    const readingsRes = await query(
      `SELECT * FROM test_readings WHERE test_id = ANY($1::uuid[]) ORDER BY reading_no ASC, created_at ASC;`,
      [testIds]
    );

    readingsRes.rows.forEach((r) => {
      if (!readingsByTestId[r.test_id]) {
        readingsByTestId[r.test_id] = [];
      }
      readingsByTestId[r.test_id].push(r);
    });
  }

  // Compute result for each test
  const hydratedTests = tests.map((test) => {
    const readings = readingsByTestId[test.id] || [];
    let computedResult = 'PENDING';

    if (readings.length > 0) {
      if (test.test_type_code === 'DISCRIMINATION') {
        computedResult = readings[0]?.result || 'PENDING';
      } else {
        const hasFail = readings.some((r) => r.result === 'FAIL');
        computedResult = hasFail ? 'FAIL' : 'PASS';
      }
    }

    test.readings = readings;
    test.computed_result = computedResult;
    return test;
  });

  return success(res, { tests: hydratedTests }, 'Session tests retrieved successfully');
};

/**
 * Delete a specific test reading (allowed only before session is COMPLETED or APPROVED)
 * DELETE /api/sessions/:sessionId/tests/:testId/readings/:readingId
 */
export const deleteTestReading = async (req, res) => {
  const { sessionId, testId, readingId } = req.params;

  const session = await getSessionAndInstrument(sessionId);
  if (!session) {
    return fail(res, 'Test session not found', 404);
  }

  if (session.status === 'COMPLETED' || session.status === 'APPROVED') {
    return fail(res, `Cannot delete readings from a ${session.status} test session`, 400);
  }

  const deleteRes = await query(
    `DELETE FROM test_readings WHERE id = $1 AND test_id = $2 RETURNING id;`,
    [readingId, testId]
  );

  if (deleteRes.rows.length === 0) {
    return fail(res, 'Test reading not found', 404);
  }

  await logAudit({
    userId: req.user.id,
    sessionId,
    action: 'DELETE_READING',
    entityType: 'test_readings',
    entityId: readingId,
    ipAddress: req.ip
  });

  return success(res, { id: readingId }, 'Reading removed successfully');
};

export default {
  getOrCreateTest,
  addTestReading,
  getSessionTests,
  deleteTestReading,
  createTestSchema
};
