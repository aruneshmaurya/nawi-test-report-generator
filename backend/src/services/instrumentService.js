/**
 * Instrument Calculation and Validation Engine
 */

/**
 * Pure function to compute number of verification intervals (n = Max / e)
 * @param {number|string} capacityMax - Maximum capacity (Max)
 * @param {number|string} e - Verification scale interval (e)
 * @returns {number} n - Number of verification scale intervals
 */
export const computeVerificationIntervals = (capacityMax, e) => {
  const max = parseFloat(capacityMax);
  const intervalE = parseFloat(e);

  if (isNaN(max) || isNaN(intervalE) || intervalE <= 0) {
    throw new Error('Invalid capacityMax or verification interval (e) provided');
  }

  return Math.round((max / intervalE) * 1000000) / 1000000;
};

/**
 * Validate whether the computed intervals (n) fall within typical OIML R-76 ranges for the accuracy class.
 * Returns an array of warning messages (non-blocking).
 * 
 * OIML R-76 Typical Ranges for n:
 * - Class I (Special): 50,000 <= n (valid up to 50,000–200,000+)
 * - Class II (High): 100 <= n <= 100,000
 * - Class III (Medium): 100 <= n <= 10,000 (often up to 10,000 in commercial NAWI)
 * - Class IIII (Ordinary): 100 <= n <= 1,000
 * 
 * @param {string} accuracyClass - 'I' | 'II' | 'III' | 'IIII'
 * @param {number} n - Number of verification intervals
 * @returns {string[]} warnings
 */
export const checkAccuracyClassPlausibility = (accuracyClass, n) => {
  const warnings = [];
  const normalizedClass = (accuracyClass || '').toUpperCase().trim();

  switch (normalizedClass) {
    case 'I':
      if (n < 50000) {
        warnings.push(`For Class I (Special Accuracy), verification intervals (n = ${n}) is typically >= 50,000.`);
      }
      break;
    case 'II':
      if (n > 100000) {
        warnings.push(`For Class II (High Accuracy), verification intervals (n = ${n}) exceeds the typical maximum of 100,000.`);
      } else if (n < 100) {
        warnings.push(`For Class II (High Accuracy), verification intervals (n = ${n}) is below the typical minimum of 100.`);
      }
      break;
    case 'III':
      if (n > 10000) {
        warnings.push(`For Class III (Medium Accuracy), verification intervals (n = ${n}) exceeds the typical maximum of 10,000 (OIML R-76-1 Table 3).`);
      } else if (n < 100) {
        warnings.push(`For Class III (Medium Accuracy), verification intervals (n = ${n}) is below the typical minimum of 100.`);
      }
      break;
    case 'IIII':
      if (n > 1000) {
        warnings.push(`For Class IIII (Ordinary Accuracy), verification intervals (n = ${n}) exceeds the typical maximum of 1,000.`);
      } else if (n < 100) {
        warnings.push(`For Class IIII (Ordinary Accuracy), verification intervals (n = ${n}) is below the typical minimum of 100.`);
      }
      break;
    default:
      // Unknown class
      break;
  }

  return warnings;
};

export default {
  computeVerificationIntervals,
  checkAccuracyClassPlausibility
};
