import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: "localhost",
  user: "root",
  database: "shop",
});

export async function getProducts() {
  const [rows] = await connection.query({
    sql: "SELECT id, name FROM products",
    timeout: 3000,
  });
  return rows;
}
