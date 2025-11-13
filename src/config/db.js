import mysql from "mysql2/promise";
import { config } from "./env.js";
import logger from "./logger.js";

const pool = mysql.createPool({
  host: config.DB_HOST,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  port: config.DB_PORT,
  waitForConnections: true,
  connectionLimit: 100, 
  queueLimit: 0,
});

pool.getConnection()
  .then(() => logger.info("MySQL Database Connected"))
  .catch((err) => logger.error("Database Connection Failed", err));

export default pool;
