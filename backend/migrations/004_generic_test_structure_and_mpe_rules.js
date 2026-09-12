/**
 * Migration 4 — Generic Test Structure & OIML MPE Rules
 * Tables: test_types, tests, test_readings, oiml_mpe_rules
 */

export const up = async (pgm) => {
  // 1. Test Types table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS test_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      display_order INTEGER
    );
  `);

  // 2. Tests table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS tests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID REFERENCES test_sessions(id) ON DELETE CASCADE,
      test_type_id UUID REFERENCES test_types(id) ON DELETE RESTRICT,
      title VARCHAR(255),
      parameters JSONB,
      result VARCHAR(50),
      remarks TEXT,
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  // 3. Test Readings table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS test_readings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
      reading_no INTEGER,
      standard_value NUMERIC,
      indicated_value NUMERIC,
      error NUMERIC,
      mpe NUMERIC,
      result VARCHAR(50),
      position VARCHAR(100),
      extra_data JSONB,
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  // 4. OIML MPE Rules table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS oiml_mpe_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      accuracy_class VARCHAR(50) NOT NULL,
      verification_type VARCHAR(50) NOT NULL,
      min_range NUMERIC NOT NULL,
      max_range NUMERIC NOT NULL,
      mpe NUMERIC NOT NULL,
      formula TEXT,
      version VARCHAR(50),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT now()
    );
  `);
};

export const down = async (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS oiml_mpe_rules CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS test_readings CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS tests CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS test_types CASCADE;`);
};
