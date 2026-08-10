import { pool } from "../config/db.js";

export const getCustomers = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, mobile, address, created_at AS createdAt FROM customers ORDER BY id DESC"
    );
    return res.status(200).json(rows);
  } catch {
    return res.status(500).json({ message: "Failed to fetch customers" });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const { name, mobile, address } = req.body;
    if (!name || !mobile || !address) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const [result] = await pool.query(
      "INSERT INTO customers (name, mobile, address) VALUES (?, ?, ?)",
      [name, mobile, address]
    );
    return res.status(201).json({ id: result.insertId, name, mobile, address });
  } catch {
    return res.status(500).json({ message: "Failed to create customer" });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { name, mobile, address } = req.body;
    const [result] = await pool.query(
      "UPDATE customers SET name = ?, mobile = ?, address = ? WHERE id = ?",
      [name, mobile, address, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }
    return res.status(200).json({ id: Number(req.params.id), name, mobile, address });
  } catch {
    return res.status(500).json({ message: "Failed to update customer" });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM customers WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }
    return res.status(200).json({ message: "Customer deleted" });
  } catch {
    return res.status(500).json({ message: "Failed to delete customer" });
  }
};
