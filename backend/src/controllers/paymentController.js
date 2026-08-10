import { pool } from "../config/db.js";
import { sendSMS } from "../utils/smsService.js";

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

    // Retrieve customer details to send SMS
    try {
      const [customerRows] = await pool.query(
        "SELECT name, mobile FROM customers WHERE id = ?",
        [customerId]
      );
      if (customerRows.length > 0) {
        const customer = customerRows[0];
        if (customer.mobile) {
          const formattedDate = new Date(paymentDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
          });
          const message = `Dear ${customer.name}, Payment Recorded: Date: ${formattedDate}, Amount: ₹${amount}, Status: ${status}. Thank you! - DairyPro`;
          sendSMS(customer.mobile, message).catch(err => 
            console.error("[SMS Error] Failed to send payment SMS:", err.message)
          );
        }
      }
    } catch (smsErr) {
      console.error("[SMS Error] Failed to retrieve customer for payment SMS:", smsErr.message);
    }

    return res.status(201).json({ id: result.insertId, customerId, paymentDate, amount, status, notes });
  } catch {
    return res.status(500).json({ message: "Failed to record payment" });
  }
};
