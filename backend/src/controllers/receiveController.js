import { pool } from "../config/db.js";

// Get all milk received entries
export const getReceives = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, received_date AS receivedDate, shift, source, quantity, fat, snf 
       FROM milk_received 
       ORDER BY received_date DESC, id DESC`
    );
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch milk receipts", error: error.message });
  }
};

// Record a new milk receipt
export const createReceive = async (req, res) => {
  try {
    const { receivedDate, shift, source, quantity, fat, snf } = req.body;
    if (!receivedDate || !shift || !source || !quantity || !fat || !snf) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const [result] = await pool.query(
      `INSERT INTO milk_received (received_date, shift, source, quantity, fat, snf)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [receivedDate, shift, source, quantity, fat, snf]
    );

    return res.status(201).json({
      id: result.insertId,
      receivedDate,
      shift,
      source,
      quantity,
      fat,
      snf,
      message: "Milk receipt recorded successfully"
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to record milk receipt", error: error.message });
  }
};

// Delete a milk receipt
export const deleteReceive = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM milk_received WHERE id = ?", [id]);
    return res.status(200).json({ message: "Milk receipt record deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete receipt", error: error.message });
  }
};
