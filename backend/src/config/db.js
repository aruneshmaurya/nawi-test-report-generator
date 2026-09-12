import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[DB CONFIG ERROR] DATABASE_URL is not set in environment variables!');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString && (connectionString.includes('supabase.co') || connectionString.includes('pooler.supabase.com') || isProduction)
    ? { rejectUnauthorized: false }
    : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('connect', () => {
  // Connected client to pool
});

pool.on('error', (err) => {
  console.error('[DB POOL ERROR] Unexpected error on idle client:', err.message, err.stack);
});

/**
 * Execute a SQL query with parameter binding and logging
 * @param {string} text - SQL query string
 * @param {Array} [params] - Query parameters
 * @returns {Promise<pg.QueryResult>}
 */
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 500) {
      console.warn(`[SLOW QUERY] ${text} [${duration}ms]`);
    }
    return res;
  } catch (error) {
    console.error(`[DB QUERY ERROR] Query failed: "${text}"`, {
      params,
      message: error.message
    });
    throw error;
  }
};

export { pool };
export default { pool, query };
