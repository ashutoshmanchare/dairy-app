import { pool } from "../config/db.js";
import { sendSMS } from "../utils/smsService.js";

export const getMilkCollections = async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.id, m.customer_id AS customerId, c.name AS customerName, m.entry_date AS entryDate,
             m.quantity, m.rate, m.total_amount AS totalAmount
      FROM milk_collections m
      JOIN customers c ON c.id = m.customer_id
      ORDER BY m.entry_date DESC, m.id DESC
    `);
    return res.status(200).json(rows);
  } catch {
    return res.status(500).json({ message: "Failed to fetch milk collections" });
  }
};

export const createMilkCollection = async (req, res) => {
  try {
    const { customerId, entryDate, quantity, rate } = req.body;
    if (!customerId || !entryDate || !quantity || !rate) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const totalAmount = Number(quantity) * Number(rate);
    const [result] = await pool.query(
      `INSERT INTO milk_collections (customer_id, entry_date, quantity, rate, total_amount)
       VALUES (?, ?, ?, ?, ?)`,
      [customerId, entryDate, quantity, rate, totalAmount]
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
          const formattedDate = new Date(entryDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
          });
          const message = `Dear ${customer.name}, Milk Entry Saved: Date: ${formattedDate}, Qty: ${quantity}L, Rate: ₹${rate}/L, Total: ₹${totalAmount}. Thank you! - DairyPro`;
          sendSMS(customer.mobile, message).catch(err => 
            console.error("[SMS Error] Failed to send entry SMS:", err.message)
          );
        }
      }
    } catch (smsErr) {
      console.error("[SMS Error] Failed to retrieve customer for SMS:", smsErr.message);
    }

    return res.status(201).json({ id: result.insertId, customerId, entryDate, quantity, rate, totalAmount });
  } catch {
    return res.status(500).json({ message: "Failed to save milk collection" });
  }
};

export const deleteMilkCollection = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM milk_collections WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Entry not found" });
    }
    return res.status(200).json({ message: "Milk entry deleted" });
  } catch {
    return res.status(500).json({ message: "Failed to delete milk entry" });
  }
};
