/**
 * Migration 1 — Core Identity & Organization
 * Tables: laboratories, manufacturers, users
 */

export const up = async (pgm) => {
  // 1. Enable UUID extensions
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

  // 2. Laboratories table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS laboratories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      address TEXT,
      registration_no VARCHAR(100),
      contact_person VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
  `);

  // 3. Manufacturers table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS manufacturers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      address TEXT,
      country VARCHAR(100),
      contact_person VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      website VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
  `);

  // 4. Users table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'TESTER', 'REVIEWER', 'LAB_HEAD')),
      lab_id UUID REFERENCES laboratories(id) ON DELETE SET NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
  `);
};

export const down = async (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS users CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS manufacturers CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS laboratories CASCADE;`);
};
