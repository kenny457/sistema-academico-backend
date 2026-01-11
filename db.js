import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:123456789@localhost:5432/postgres",
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

