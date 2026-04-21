import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PGHOST,
  database: "analytics",
});

export async function getDailyMetrics(day: string) {
  const result = await pool.query({
    text: "SELECT metric, value FROM daily_metrics WHERE day = $1",
    values: [day],
    statement_timeout: 5000,
  });
  return result.rows;
}
