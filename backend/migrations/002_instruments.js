/**
 * Migration 2 — Instruments
 * Table: instruments
 */

export const up = async (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS instruments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      manufacturer_id UUID REFERENCES manufacturers(id) ON DELETE RESTRICT,
      model VARCHAR(255) NOT NULL,
      serial_number VARCHAR(255) NOT NULL UNIQUE,
      instrument_type VARCHAR(50) NOT NULL CHECK (instrument_type IN ('SINGLE_RANGE', 'MULTI_RANGE')),
      accuracy_class VARCHAR(50),
      capacity_max NUMERIC,
      capacity_min NUMERIC,
      verification_interval_e NUMERIC,
      actual_interval_d NUMERIC,
      verification_intervals_n INTEGER,
      power_source VARCHAR(100),
      software_version VARCHAR(100),
      firmware_version VARCHAR(100),
      manufacture_date DATE,
      nameplate_photo VARCHAR(500),
      instrument_photo VARCHAR(500),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
  `);
};

export const down = async (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS instruments CASCADE;`);
};
