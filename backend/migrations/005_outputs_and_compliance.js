/**
 * Migration 5 — Outputs & Compliance
 * Tables: attachments, reports, digital_signatures, qr_codes
 */

export const up = async (pgm) => {
  // 1. Attachments table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS attachments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID REFERENCES test_sessions(id) ON DELETE CASCADE,
      file_type VARCHAR(100),
      file_name VARCHAR(255),
      file_url VARCHAR(500),
      file_category VARCHAR(50) CHECK (file_category IN ('INSTRUMENT_PHOTO', 'NAMEPLATE', 'CERTIFICATE', 'TEST_PHOTO', 'OTHER')),
      uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
      uploaded_at TIMESTAMP DEFAULT now()
    );
  `);

  // 2. Reports table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID REFERENCES test_sessions(id) ON DELETE CASCADE,
      report_number VARCHAR(100) NOT NULL UNIQUE,
      pdf_url VARCHAR(500),
      word_url VARCHAR(500),
      qr_code TEXT,
      overall_result VARCHAR(50),
      generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      generated_at TIMESTAMP DEFAULT now(),
      is_signed BOOLEAN DEFAULT false,
      version INTEGER DEFAULT 1,
      remarks TEXT
    );
  `);

  // 3. Digital Signatures table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS digital_signatures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
      signed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
      designation VARCHAR(100),
      signature_image TEXT,
      signed_at TIMESTAMP DEFAULT now()
    );
  `);

  // 4. QR Codes table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS qr_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
      qr_token VARCHAR(255) NOT NULL UNIQUE,
      verification_url VARCHAR(500) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT now()
    );
  `);
};

export const down = async (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS qr_codes CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS digital_signatures CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS reports CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS attachments CASCADE;`);
};
