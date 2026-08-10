import { pool } from "../config/db.js";

// Record a deduction (feed, loan, medicine, other)
export const createDeduction = async (req, res) => {
  try {
    const { customerId, type, amount, deductionDate, notes } = req.body;
    if (!customerId || !type || !amount || !deductionDate) {
      return res.status(400).json({ message: "Customer ID, type, amount, and date are required" });
    }

    const [result] = await pool.query(
      "INSERT INTO deductions (customer_id, type, amount, deduction_date, notes) VALUES (?, ?, ?, ?, ?)",
      [customerId, type, amount, deductionDate, notes]
    );

    return res.status(201).json({ id: result.insertId, customerId, type, amount, deductionDate, notes });
  } catch (error) {
    return res.status(500).json({ message: "Failed to record deduction", error: error.message });
  }
};

// Get deductions list
export const getDeductions = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT d.id, d.customer_id AS customerId, c.name AS customerName, c.farmer_code AS farmerCode,
             d.type, d.amount, d.deduction_date AS deductionDate, d.notes, d.is_recovered AS isRecovered
      FROM deductions d
      JOIN customers c ON c.id = d.customer_id
      ORDER BY d.deduction_date DESC, d.id DESC
    `);
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch deductions", error: error.message });
  }
};
