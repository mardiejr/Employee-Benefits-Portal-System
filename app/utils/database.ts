// utils/database.ts
import { Pool } from "pg";

// Create different database configurations for development and production
const createPool = () => {
  // Check if we're in production (Vercel) or development (local)
  if (process.env.NODE_ENV === 'production') {
    // For Neon in production
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Required for Neon
      },
      max: 20, // Connection pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
  } else {
    // For local development
    return new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT || '3690')
    });
  }
};

// Create and export the database pool
const pool = createPool();

/**
 * Executes a database query with proper error handling
 * @param text SQL query text
 * @param params Query parameters
 * @returns Query result
 */
export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  
  try {
    const start = Date.now();
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries for monitoring
    if (duration > 500) {
      console.log('Slow query:', { text, duration, rows: res.rowCount });
    }
    
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}

/**
 * Executes multiple queries in a transaction
 * @param queries Array of { text, params } objects
 * @returns Results of all queries
 */
export async function transaction(queries: { text: string, params?: any[] }[]) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const results = [];
    for (const q of queries) {
      const result = await client.query(q.text, q.params);
      results.push(result);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default pool;