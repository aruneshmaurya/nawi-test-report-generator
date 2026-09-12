import { query } from '../config/db.js';

/**
 * Format position enum into human readable text
 * e.g. FRONT_RIGHT -> "Front-Right"
 */
const formatPosition = (pos) => {
  if (!pos) return 'Unspecified position';
  return pos
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('-');
};

/**
 * Aggregate all test results for a session and compute per-test and overall pass/fail with detailed reasons
 * @param {string} sessionId - UUID of test session
 * @returns {Promise<object>}
 */
export const aggregateSessionSummary = async (sessionId) => {
  // 1. Fetch session, instrument, lab, tester
  const sessionRes = await query(
    `SELECT s.*,
            i.model AS instrument_model, i.serial_number AS instrument_serial,
            i.accuracy_class, i.capacity_max, i.capacity_min, i.verification_interval_e,
            i.actual_interval_d, i.verification_intervals_n,
            m.name AS manufacturer_name, m.country AS manufacturer_country,
            u.name AS tester_name, u.email AS tester_email,
            l.name AS lab_name, l.registration_no AS lab_registration_no, l.address AS lab_address
     FROM test_sessions s
     JOIN instruments i ON s.instrument_id = i.id
     LEFT JOIN manufacturers m ON i.manufacturer_id = m.id
     JOIN users u ON s.tester_id = u.id
     JOIN laboratories l ON s.lab_id = l.id
     WHERE s.id = $1 LIMIT 1;`,
    [sessionId]
  );

  if (sessionRes.rows.length === 0) {
    throw new Error('Test session not found');
  }

  const session = sessionRes.rows[0];

  // 2. Fetch tests and readings
  const testsRes = await query(
    `SELECT t.*, tt.code AS test_type_code, tt.name AS test_type_name, tt.display_order
     FROM tests t
     JOIN test_types tt ON t.test_type_id = tt.id
     WHERE t.session_id = $1
     ORDER BY tt.display_order ASC;`,
    [sessionId]
  );

  const tests = testsRes.rows;
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

  // 3. Process each test
  const failureReasons = [];
  const testSummaries = {};

  const STANDARD_TEST_CODES = ['ACCURACY', 'ECCENTRICITY', 'REPEATABILITY', 'DISCRIMINATION'];

  // Initialize standard tests
  STANDARD_TEST_CODES.forEach((code) => {
    testSummaries[code] = {
      test_type_code: code,
      name: code.charAt(0) + code.slice(1).toLowerCase() + ' Test',
      attempted: false,
      result: 'NOT_ATTEMPTED',
      readings_count: 0,
      failing_readings: []
    };
  });

  tests.forEach((test) => {
    const code = test.test_type_code;
    const readings = readingsByTestId[test.id] || [];

    const summary = {
      id: test.id,
      test_type_code: code,
      name: test.test_type_name || test.title,
      attempted: readings.length > 0,
      result: readings.length > 0 ? 'PASS' : 'NOT_ATTEMPTED',
      readings_count: readings.length,
      readings,
      failing_readings: []
    };

    if (readings.length > 0) {
      if (code === 'DISCRIMINATION') {
        const discReading = readings[0];
        summary.result = discReading.result || 'FAIL';
        if (summary.result === 'FAIL') {
          summary.failing_readings.push(discReading);
          failureReasons.push(
            `Discrimination failed at base load ${discReading.standard_value}g (display did not change on small weight addition)`
          );
        }
      } else {
        readings.forEach((r) => {
          if (r.result === 'FAIL') {
            summary.result = 'FAIL';
            summary.failing_readings.push(r);

            if (code === 'ACCURACY') {
              const sign = r.error > 0 ? '+' : '';
              failureReasons.push(
                `Accuracy failed at ${r.standard_value}g (error ${sign}${r.error}g > MPE ±${r.mpe}g)`
              );
            } else if (code === 'ECCENTRICITY') {
              const sign = r.error > 0 ? '+' : '';
              failureReasons.push(
                `Eccentricity failed at ${formatPosition(r.position)} (error ${sign}${r.error}g > MPE ±${r.mpe}g)`
              );
            } else if (code === 'REPEATABILITY') {
              const spread = r.error || r.extra_data?.spread;
              failureReasons.push(
                `Repeatability failed (spread ${spread}g > MPE ${r.mpe}g)`
              );
            }
          }
        });
      }
    }

    testSummaries[code] = summary;
  });

  // 4. Compute overall result
  const attemptedTests = Object.values(testSummaries).filter((t) => t.attempted);
  let overallResult = 'PENDING';
  let overallReason = '';

  if (attemptedTests.length > 0) {
    const hasAnyFailure = attemptedTests.some((t) => t.result === 'FAIL');
    if (hasAnyFailure) {
      overallResult = 'FAIL';
      overallReason = failureReasons.join('; ');
    } else {
      overallResult = 'PASS';
      overallReason = 'All tests passed within OIML R-76 Maximum Permissible Error (MPE) limits.';
    }
  } else {
    overallReason = 'No test readings recorded yet.';
  }

  return {
    session,
    tests: testSummaries,
    attempted_count: attemptedTests.length,
    overall_result: overallResult,
    failure_reasons: failureReasons,
    reason_string: overallReason
  };
};

export default {
  aggregateSessionSummary
};
