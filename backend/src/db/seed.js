import 'dotenv/config';
import { pool } from '../config/db.js';
import { hashPassword } from '../services/authService.js';

export const seedDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log('[SEED] Starting database seed...');
    await client.query('BEGIN');

    // 1. Seed Test Types (Idempotent)
    const testTypes = [
      {
        code: 'ACCURACY',
        name: 'Accuracy Test',
        description: 'Accuracy test of indication for increasing and decreasing loads across operational range',
        display_order: 1
      },
      {
        code: 'ECCENTRICITY',
        name: 'Eccentricity Test',
        description: 'Eccentricity test with off-center loading across 5 designated load receptor positions',
        display_order: 2
      },
      {
        code: 'REPEATABILITY',
        name: 'Repeatability Test',
        description: 'Repeatability test across multiple weighing trials with identical standard test load',
        display_order: 3
      },
      {
        code: 'DISCRIMINATION',
        name: 'Discrimination Test',
        description: 'Discrimination test assessing responsiveness upon addition of small extra load (1.4d)',
        display_order: 4
      }
    ];

    for (const tt of testTypes) {
      await client.query(
        `INSERT INTO test_types (code, name, description, is_active, display_order)
         VALUES ($1, $2, $3, true, $4)
         ON CONFLICT (code) DO UPDATE
         SET name = EXCLUDED.name, description = EXCLUDED.description, display_order = EXCLUDED.display_order;`,
        [tt.code, tt.name, tt.description, tt.display_order]
      );
    }
    console.log('✓ Seeded 4 test_types (ACCURACY, ECCENTRICITY, REPEATABILITY, DISCRIMINATION)');

    // 2. Seed OIML MPE Rules (Accuracy Class III, Initial Verification)
    const mpeRules = [
      {
        accuracy_class: 'III',
        verification_type: 'INITIAL',
        min_range: 0,
        max_range: 500,
        mpe: 0.5,
        formula: 'MPE = ±0.5 * e (for 0 <= m <= 500e)',
        version: 'OIML R-76-1:2006'
      },
      {
        accuracy_class: 'III',
        verification_type: 'INITIAL',
        min_range: 500,
        max_range: 2000,
        mpe: 1.0,
        formula: 'MPE = ±1.0 * e (for 500e < m <= 2000e)',
        version: 'OIML R-76-1:2006'
      },
      {
        accuracy_class: 'III',
        verification_type: 'INITIAL',
        min_range: 2000,
        max_range: 10000,
        mpe: 1.5,
        formula: 'MPE = ±1.5 * e (for 2000e < m <= 10000e)',
        version: 'OIML R-76-1:2006'
      }
    ];

    await client.query(
      `DELETE FROM oiml_mpe_rules WHERE accuracy_class = 'III' AND verification_type = 'INITIAL';`
    );

    for (const rule of mpeRules) {
      await client.query(
        `INSERT INTO oiml_mpe_rules (accuracy_class, verification_type, min_range, max_range, mpe, formula, version, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true);`,
        [
          rule.accuracy_class,
          rule.verification_type,
          rule.min_range,
          rule.max_range,
          rule.mpe,
          rule.formula,
          rule.version
        ]
      );
    }
    console.log('✓ Seeded oiml_mpe_rules (Class III Initial Verification)');

    // 3. Seed Sample Laboratory
    let labResult = await client.query(
      `SELECT id FROM laboratories WHERE registration_no = $1 LIMIT 1;`,
      ['NABL-OIML-2026-001']
    );

    let labId;
    if (labResult.rows.length === 0) {
      const insertedLab = await client.query(
        `INSERT INTO laboratories (name, address, registration_no, contact_person, email, phone, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING id;`,
        [
          'National Metrology Laboratory (NML)',
          'CSIR Complex, New Delhi - 110012, India',
          'NABL-OIML-2026-001',
          'Dr. K. S. Metrologist',
          'contact@nml.gov.in',
          '+91-11-23456789'
        ]
      );
      labId = insertedLab.rows[0].id;
    } else {
      labId = labResult.rows[0].id;
    }
    console.log(`✓ Seeded laboratory (National Metrology Laboratory - ID: ${labId})`);

    // 4. Seed ADMIN user with dynamic bcrypt hash of Admin@12345
    const dynamicAdminHash = await hashPassword('Admin@12345');

    await client.query(
      `INSERT INTO users (name, email, password_hash, role, lab_id, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, lab_id = EXCLUDED.lab_id;`,
      ['Admin User', 'admin@nawi-lab.test', dynamicAdminHash, 'ADMIN', labId]
    );
    console.log('✓ Seeded ADMIN user with real bcrypt hash (email: admin@nawi-lab.test)');

    await client.query('COMMIT');
    console.log('[SEED] Database seed completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[SEED ERROR] Seeding failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedDatabase;
