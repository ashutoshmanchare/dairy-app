import { pool } from "../config/db.js";

export const getPayments = async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.id, p.customer_id AS customerId, c.name AS customerName, p.payment_date AS paymentDate,
             p.amount, p.status, p.notes
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      ORDER BY p.payment_date DESC, p.id DESC
    `);
    return res.status(200).json(rows);
  } catch {
    return res.status(500).json({ message: "Failed to fetch payments" });
  }
};

export const createPayment = async (req, res) => {
  try {
    const { customerId, paymentDate, amount, status = "paid", notes = "" } = req.body;
    if (!customerId || !paymentDate || !amount) {
      return res.status(400).json({ message: "Required fields missing" });
    }
    const [result] = await pool.query(
      "INSERT INTO payments (customer_id, payment_date, amount, status, notes) VALUES (?, ?, ?, ?, ?)",
      [customerId, paymentDate, amount, status, notes]
    );
    return res.status(201).json({ id: result.insertId, customerId, paymentDate, amount, status, notes });
  } catch {
    return res.status(500).json({ message: "Failed to record payment" });
  }
};
