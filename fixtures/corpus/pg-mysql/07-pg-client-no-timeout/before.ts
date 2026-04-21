import { Client } from "pg";

const client = new Client({
  host: process.env.PGHOST,
  database: "billing",
});

export async function getInvoices() {
  const result = await client.query("SELECT id, total FROM invoices");
  return result.rows;
}
