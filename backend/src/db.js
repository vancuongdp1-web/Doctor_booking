import mysql from 'mysql2/promise';
import 'dotenv/config';
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'medicare',
  dateStrings: true, waitForConnections: true, connectionLimit: 10,
});
export const q = async (sql, params = []) => (await pool.query(sql, params))[0];
