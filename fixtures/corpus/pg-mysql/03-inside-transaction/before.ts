import { Pool, PoolClient } from "pg";

const pool = new Pool({
  host: process.env.PGHOST,
  database: "accounts",
});

export async function transferFunds(fromId: string, toId: string, amount: number) {
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE accounts SET balance = balance - $1 WHERE id = $2",
      [amount, fromId]
    );
    await client.query(
      "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
      [amount, toId]
    );
    await client.query(
      "INSERT INTO transfers (from_id, to_id, amount) VALUES ($1, $2, $3)",
      [fromId, toId, amount]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
