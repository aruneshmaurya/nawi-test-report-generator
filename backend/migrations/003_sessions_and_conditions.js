/**
 * Migration 3 — Sessions & Conditions
 * Tables: test_sessions, environments, reference_weights
 */

export const up = async (pgm) => {
  // 1. Test Sessions table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS test_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_number VARCHAR(100) NOT NULL UNIQUE,
      instrument_id UUID REFERENCES instruments(id) ON DELETE RESTRICT,
      lab_id UUID REFERENCES laboratories(id) ON DELETE RESTRICT,
      tester_id UUID REFERENCES users(id) ON DELETE RESTRICT,
      verification_type VARCHAR(50) NOT NULL CHECK (verification_type IN ('INITIAL', 'IN_SERVICE')),
      status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'APPROVED')),
      started_at TIMESTAMP DEFAULT now(),
      completed_at TIMESTAMP,
      overall_result VARCHAR(50),
      remarks TEXT,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
  `);

  // 2. Environments table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS environments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID REFERENCES test_sessions(id) ON DELETE CASCADE,
      temperature NUMERIC,
      humidity NUMERIC,
      atmospheric_pressure NUMERIC,
      supply_voltage NUMERIC,
      frequency NUMERIC,
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  // 3. Reference Weights table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS reference_weights (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID REFERENCES test_sessions(id) ON DELETE CASCADE,
      nominal_value NUMERIC,
      weight_class VARCHAR(50),
      certificate_no VARCHAR(100),
      valid_upto DATE,
      created_at TIMESTAMP DEFAULT now()
    );
  `);
};

export const down = async (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS reference_weights CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS environments CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS test_sessions CASCADE;`);
};
