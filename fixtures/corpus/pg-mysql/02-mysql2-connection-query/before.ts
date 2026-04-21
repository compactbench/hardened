import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: "localhost",
  user: "root",
  database: "shop",
  password: process.env.MYSQL_PASSWORD,
});

export async function findOrdersByCustomer(customerId: number) {
  const [rows] = await connection.query(
    "SELECT id, total, status FROM orders WHERE customer_id = ? ORDER BY created_at DESC",
    [customerId]
  );
  return rows;
}
