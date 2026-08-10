import { pool } from "../config/db.js";

// Record an advance given to a farmer
export const createAdvance = async (req, res) => {
  try {
    const { customerId, amount, advanceDate, notes } = req.body;
    if (!customerId || !amount || !advanceDate) {
      return res.status(400).json({ message: "Customer ID, amount, and date are required" });
    }

    const [result] = await pool.query(
      "INSERT INTO advances (customer_id, amount, advance_date, notes) VALUES (?, ?, ?, ?)",
      [customerId, amount, advanceDate, notes]
    );

    return res.status(201).json({ id: result.insertId, customerId, amount, advanceDate, notes });
  } catch (error) {
    return res.status(500).json({ message: "Failed to record advance", error: error.message });
  }
};

// Get advances list
export const getAdvances = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.id, a.customer_id AS customerId, c.name AS customerName, c.farmer_code AS farmerCode,
             a.amount, a.advance_date AS advanceDate, a.notes, a.recovered_amount AS recoveredAmount
      FROM advances a
      JOIN customers c ON c.id = a.customer_id
      ORDER BY a.advance_date DESC, a.id DESC
    `);
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch advances", error: error.message });
  }
};

// Get customer advance summary
export const getCustomerAdvanceSummary = async (req, res) => {
  try {
    const { customerId } = req.params;
    const [rows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS totalAdvance, 
              COALESCE(SUM(recovered_amount), 0) AS totalRecovered,
              COALESCE(SUM(amount - recovered_amount), 0) AS outstandingAdvance
       FROM advances WHERE customer_id = ?`,
      [customerId]
    );
    return res.status(200).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch advance summary", error: error.message });
  }
};
