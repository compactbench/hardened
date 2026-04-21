import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: 5432,
});

export async function getActiveUsers() {
  const result = await pool.query(
    "SELECT id, email, created_at FROM users WHERE active = true ORDER BY created_at DESC LIMIT 100"
  );
  return result.rows;
}
