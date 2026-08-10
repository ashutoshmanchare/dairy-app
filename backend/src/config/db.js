import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const poolConfig = (process.env.DATABASE_URL || process.env.MYSQL_URL)
  ? (process.env.DATABASE_URL || process.env.MYSQL_URL)
  : {
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10
    };

export const pool = mysql.createPool(poolConfig);

const createTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      username VARCHAR(120) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'user') DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      mobile VARCHAR(20) NOT NULL,
      address TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS milk_collections (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      entry_date DATE NOT NULL,
      quantity DECIMAL(10,2) NOT NULL,
      rate DECIMAL(10,2) NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      payment_date DATE NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      status ENUM('paid', 'pending') DEFAULT 'pending',
      notes VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);
};

const seedDefaultAdmin = async () => {
  const [rows] = await pool.query("SELECT id FROM users WHERE username = ?", ["Ashu.M"]);
  if (rows.length > 0) {
    return;
  }
  const hash = await bcrypt.hash("123", 10);
  try {
    await pool.query(
      "INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)",
      ["Ashu.M", "Ashu.M", hash, "admin"]
    );
  } catch (error) {
    // Ignore race/duplicate if admin was created concurrently
    if (error?.code !== "ER_DUP_ENTRY") {
      throw error;
    }
  }
};

export const connectDB = async () => {
  try {
    const conn = await pool.getConnection();
    conn.release();
    await createTables();
    await seedDefaultAdmin();
    console.log("MySQL connected");
  } catch (error) {
    console.error("MySQL connection failed:", error.message);
    process.exit(1);
  }
};
