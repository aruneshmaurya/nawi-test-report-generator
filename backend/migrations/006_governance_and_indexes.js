/**
 * Migration 6 — Governance & Indexes
 * Tables: audit_logs, notifications
 * Explicit Indexes: users(email), instruments(serial_number), test_sessions(session_number, status), reports(report_number), qr_codes(qr_token)
 */

export const up = async (pgm) => {
  // 1. Audit Logs table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      session_id UUID,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100),
      entity_id UUID,
      old_value JSONB,
      new_value JSONB,
      ip_address VARCHAR(100),
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  // 2. Notifications table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      type VARCHAR(50),
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  // 3. Required Indexes
  pgm.sql(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
  pgm.sql(`CREATE UNIQUE INDEX IF NOT EXISTS idx_instruments_serial_number ON instruments(serial_number);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_test_sessions_session_number_status ON test_sessions(session_number, status);`);
  pgm.sql(`CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_report_number ON reports(report_number);`);
  pgm.sql(`CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_codes_qr_token ON qr_codes(qr_token);`);
};

export const down = async (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_qr_codes_qr_token;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_reports_report_number;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_test_sessions_session_number_status;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_instruments_serial_number;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_users_email;`);
  pgm.sql(`DROP TABLE IF EXISTS notifications CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS audit_logs CASCADE;`);
};
