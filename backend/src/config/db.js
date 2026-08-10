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

const addColumnIfNotExist = async (table, column, definition) => {
  try {
    const [cols] = await pool.query(
      "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
      [table, column]
    );
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`Migration: Added column ${column} to table ${table}`);
    }
  } catch (err) {
    console.error(`Migration error: Failed to add column ${column} to table ${table}`, err.message);
  }
};

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

  // Column upgrades for customers
  await addColumnIfNotExist("customers", "farmer_code", "VARCHAR(50) DEFAULT NULL");
  await addColumnIfNotExist("customers", "village", "VARCHAR(120) DEFAULT NULL");
  await addColumnIfNotExist("customers", "bank_details", "TEXT DEFAULT NULL");
  await addColumnIfNotExist("customers", "default_animal_type", "ENUM('cow', 'buffalo') DEFAULT 'cow'");
  await addColumnIfNotExist("customers", "joining_date", "DATE DEFAULT NULL");
  await addColumnIfNotExist("customers", "status", "ENUM('active', 'inactive') DEFAULT 'active'");

  // Column upgrades for milk_collections
  await addColumnIfNotExist("milk_collections", "shift", "ENUM('morning', 'evening') DEFAULT 'morning'");
  await addColumnIfNotExist("milk_collections", "animal_type", "ENUM('cow', 'buffalo') DEFAULT 'cow'");
  await addColumnIfNotExist("milk_collections", "fat", "DECIMAL(5,2) DEFAULT 0.0");
  await addColumnIfNotExist("milk_collections", "snf", "DECIMAL(5,2) DEFAULT 0.0");
  await addColumnIfNotExist("milk_collections", "clr", "DECIMAL(5,2) DEFAULT 0.0");
  await addColumnIfNotExist("milk_collections", "center_id", "INT DEFAULT NULL");
  await addColumnIfNotExist("milk_collections", "route_id", "INT DEFAULT NULL");

  // New modules tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rate_charts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      animal_type ENUM('cow', 'buffalo') NOT NULL,
      calculation_type ENUM('fat_only', 'fat_snf', 'fat_clr', 'fixed') NOT NULL,
      fixed_rate DECIMAL(10,2) DEFAULT NULL,
      base_fat DECIMAL(5,2) DEFAULT NULL,
      base_snf DECIMAL(5,2) DEFAULT NULL,
      base_rate DECIMAL(10,2) DEFAULT NULL,
      is_active TINYINT DEFAULT 0,
      effective_from DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rate_chart_matrix (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rate_chart_id INT NOT NULL,
      fat DECIMAL(5,2) NOT NULL,
      snf DECIMAL(5,2) NOT NULL,
      rate DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (rate_chart_id) REFERENCES rate_charts(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS advances (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      advance_date DATE NOT NULL,
      notes VARCHAR(255),
      recovered_amount DECIMAL(10,2) DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS deductions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      type ENUM('feed', 'loan', 'medicine', 'other') NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      deduction_date DATE NOT NULL,
      notes VARCHAR(255),
      is_recovered TINYINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS feed_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      stock_quantity DECIMAL(10,2) NOT NULL,
      unit VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS feed_sales (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      feed_item_id INT NOT NULL,
      quantity DECIMAL(10,2) NOT NULL,
      rate DECIMAL(10,2) NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      sale_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (feed_item_id) REFERENCES feed_items(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS collection_centers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      code VARCHAR(50) NOT NULL UNIQUE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS routes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      center_id INT,
      FOREIGN KEY (center_id) REFERENCES collection_centers(id) ON DELETE SET NULL
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
