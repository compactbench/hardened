import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PGHOST,
  database: "reports",
});

export async function getReportRows() {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT id, title FROM reports");
    return result.rows;
  } finally {
    client.release();
  }
}
