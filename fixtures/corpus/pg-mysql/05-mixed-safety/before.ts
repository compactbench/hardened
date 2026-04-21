import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PGHOST,
  database: "reports",
});

export async function getSafeReport(reportId: string) {
  const result = await pool.query({
    text: "SELECT id, title, generated_at FROM reports WHERE id = $1",
    values: [reportId],
    statement_timeout: 3000,
  });
  return result.rows[0];
}

export async function getUnsafeReport(reportId: string) {
  const result = await pool.query(
    "SELECT id, title, generated_at FROM reports WHERE id = $1",
    [reportId]
  );
  return result.rows[0];
}
