import { query } from '../config/db.js';

/**
 * Core OIML R-76 MPE Calculation & Pass/Fail Evaluation Engine
 */

/**
 * Look up applicable Maximum Permissible Error (MPE) for a given load and instrument parameters.
 * 
 * @param {object} params
 * @param {string} params.accuracyClass - Accuracy class ('I', 'II', 'III', 'IIII')
 * @param {string} params.verificationType - 'INITIAL' | 'IN_SERVICE'
 * @param {number|string} params.loadValue - Applied test load in units (e.g. grams or kg)
 * @param {number|string} params.e - Verification scale interval (e) in same units
 * @returns {Promise<{ mpe: number, multiplier: number, formula: string, isFallback: boolean }>}
 */
export const getApplicableMPE = async ({ accuracyClass, verificationType, loadValue, e }) => {
  const load = parseFloat(loadValue);
  const intervalE = parseFloat(e);

  if (isNaN(load) || isNaN(intervalE) || intervalE <= 0) {
    throw new Error('Invalid loadValue or verification interval (e) provided');
  }

  const normalizedClass = (accuracyClass || '').toUpperCase().trim();
  const normalizedVerification = (verificationType || 'INITIAL').toUpperCase().trim();
  const loadInE = Math.round((load / intervalE) * 1000000) / 1000000;

  // 1. Query matching rule from oiml_mpe_rules
  // OIML R-76 brackets: 0 <= m <= 500e, 500e < m <= 2000e, 2000e < m <= 10000e
  const ruleRes = await query(
    `SELECT min_range, max_range, mpe, formula, version
     FROM oiml_mpe_rules
     WHERE UPPER(accuracy_class) = $1
       AND UPPER(verification_type) = $2
       AND is_active = true
       AND (
         (min_range = 0 AND $3 >= min_range AND $3 <= max_range)
         OR (min_range > 0 AND $3 > min_range AND $3 <= max_range)
       )
     ORDER BY min_range ASC
     LIMIT 1;`,
    [normalizedClass, normalizedVerification, loadInE]
  );

  if (ruleRes.rows.length > 0) {
    const row = ruleRes.rows[0];
    const multiplier = parseFloat(row.mpe);
    const mpeValue = Math.round(multiplier * intervalE * 1000000) / 1000000;

    return {
      mpe: mpeValue,
      multiplier,
      formula: row.formula || `±${multiplier} * e`,
      isFallback: false
    };
  }

  // 2. Fallback for IN_SERVICE when no explicit in-service row exists
  if (normalizedVerification === 'IN_SERVICE') {
    const initialRuleRes = await query(
      `SELECT min_range, max_range, mpe, formula, version
       FROM oiml_mpe_rules
       WHERE UPPER(accuracy_class) = $1
         AND UPPER(verification_type) = 'INITIAL'
         AND is_active = true
         AND (
           (min_range = 0 AND $2 >= min_range AND $2 <= max_range)
           OR (min_range > 0 AND $2 > min_range AND $2 <= max_range)
         )
       ORDER BY min_range ASC
       LIMIT 1;`,
      [normalizedClass, loadInE]
    );

    if (initialRuleRes.rows.length > 0) {
      const initialRow = initialRuleRes.rows[0];
      const initialMultiplier = parseFloat(initialRow.mpe);
      const doubledMultiplier = initialMultiplier * 2;
      const mpeValue = Math.round(doubledMultiplier * intervalE * 1000000) / 1000000;

      console.warn(
        `[MPE FALLBACK] No explicit in-service rule found for Class ${normalizedClass} at ${loadInE}e. Falling back to 2x initial MPE rule (multiplier: ${doubledMultiplier}e).`
      );

      return {
        mpe: mpeValue,
        multiplier: doubledMultiplier,
        formula: `2 * (${initialRow.formula || `±${initialMultiplier} * e`}) [IN_SERVICE Fallback]`,
        isFallback: true
      };
    }
  }

  throw new Error(
    `No applicable OIML MPE rule found for Accuracy Class "${accuracyClass}", Verification Type "${verificationType}" at load ${loadValue} (${loadInE}e).`
  );
};

/**
 * Reusable evaluation function for individual point-load readings (Accuracy, Eccentricity)
 * 
 * @param {object} params
 * @param {number|string} params.indicatedValue - Scale reading (Indicated)
 * @param {number|string} params.standardValue - Reference weight (Standard)
 * @param {number|string} params.mpe - Maximum Permissible Error (absolute units)
 * @returns {{ error: number, result: 'PASS' | 'FAIL' }}
 */
export const evaluateReading = ({ indicatedValue, standardValue, mpe }) => {
  const indicated = parseFloat(indicatedValue);
  const standard = parseFloat(standardValue);
  const mpeVal = Math.abs(parseFloat(mpe));

  if (isNaN(indicated) || isNaN(standard) || isNaN(mpeVal)) {
    throw new Error('indicatedValue, standardValue, and mpe must be valid numbers');
  }

  const error = Math.round((indicated - standard) * 1000000) / 1000000;
  const result = Math.abs(error) <= (mpeVal + 1e-9) ? 'PASS' : 'FAIL';

  return {
    error,
    result
  };
};

/**
 * Evaluate spread for repeatability test (series of weighings with the same load)
 * spread = max(readings) - min(readings)
 * result = spread <= mpe ? 'PASS' : 'FAIL'
 * 
 * @param {object} params
 * @param {Array<number|string>} params.indicatedValues - Array of trial readings (min 3)
 * @param {number|string} params.mpe - Maximum Permissible Error (absolute units)
 * @returns {{ spread: number, result: 'PASS' | 'FAIL' }}
 */
export const evaluateSpread = ({ indicatedValues, mpe }) => {
  if (!Array.isArray(indicatedValues) || indicatedValues.length < 3) {
    throw new Error('Repeatability evaluation requires at least 3 indicated values');
  }

  const values = indicatedValues.map((v) => {
    const num = parseFloat(v);
    if (isNaN(num)) {
      throw new Error(`Invalid non-numeric value in repeatability readings: ${v}`);
    }
    return num;
  });

  const mpeVal = Math.abs(parseFloat(mpe));
  if (isNaN(mpeVal)) {
    throw new Error('mpe must be a valid number');
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const spread = Math.round((max - min) * 1000000) / 1000000;
  const result = spread <= (mpeVal + 1e-9) ? 'PASS' : 'FAIL';

  return {
    spread,
    result
  };
};

/**
 * Evaluate discrimination test
 * Boolean check: displayChanged === true -> 'PASS', else 'FAIL'
 * 
 * @param {object} params
 * @param {boolean} params.displayChanged
 * @returns {{ result: 'PASS' | 'FAIL' }}
 */
export const evaluateDiscrimination = ({ displayChanged }) => {
  const result = Boolean(displayChanged) === true ? 'PASS' : 'FAIL';
  return { result };
};

export default {
  getApplicableMPE,
  evaluateReading,
  evaluateSpread,
  evaluateDiscrimination
};
