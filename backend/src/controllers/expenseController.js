import { pool } from "../config/db.js";

// Get all expenses
export const getExpenses = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, title, amount, expense_date AS expenseDate, notes FROM dairy_expenses ORDER BY expense_date DESC, id DESC"
    );
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch expenses", error: error.message });
  }
};

// Create a new expense
export const createExpense = async (req, res) => {
  try {
    const { title, amount, expenseDate, notes } = req.body;
    if (!title || !amount || !expenseDate) {
      return res.status(400).json({ message: "Title, amount, and date are required" });
    }

    const [result] = await pool.query(
      `INSERT INTO dairy_expenses (title, amount, expense_date, notes)
       VALUES (?, ?, ?, ?)`,
      [title, amount, expenseDate, notes || ""]
    );

    return res.status(201).json({
      id: result.insertId,
      title,
      amount,
      expenseDate,
      notes,
      message: "Expense recorded successfully"
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to record expense", error: error.message });
  }
};

// Delete an expense
export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM dairy_expenses WHERE id = ?", [id]);
    return res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete expense", error: error.message });
  }
};
