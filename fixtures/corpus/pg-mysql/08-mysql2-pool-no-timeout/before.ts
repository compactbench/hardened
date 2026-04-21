import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  database: "shop",
});

export async function getProducts() {
  const [rows] = await pool.query("SELECT id, name FROM products");
  return rows;
}
