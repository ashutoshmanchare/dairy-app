import { pool } from "../config/db.js";

// Get all milk sales
export const getMilkSales = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, buyer_name AS buyerName, sale_date AS saleDate, shift, animal_type AS animalType, quantity, rate, total_amount AS totalAmount FROM milk_sales ORDER BY sale_date DESC, id DESC"
    );
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch milk sales", error: error.message });
  }
};

// Create a new milk sale
export const createMilkSale = async (req, res) => {
  try {
    const { buyerName, saleDate, shift, animalType, quantity, rate } = req.body;
    if (!buyerName || !saleDate || !shift || !animalType || !quantity || !rate) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const totalAmount = Number(quantity) * Number(rate);

    const [result] = await pool.query(
      `INSERT INTO milk_sales (buyer_name, sale_date, shift, animal_type, quantity, rate, total_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [buyerName, saleDate, shift, animalType, quantity, rate, totalAmount]
    );

    return res.status(201).json({
      id: result.insertId,
      buyerName,
      saleDate,
      shift,
      animalType,
      quantity,
      rate,
      totalAmount,
      message: "Milk sale recorded successfully"
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to record milk sale", error: error.message });
  }
};

// Delete a milk sale
export const deleteMilkSale = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM milk_sales WHERE id = ?", [id]);
    return res.status(200).json({ message: "Milk sale record deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete milk sale", error: error.message });
  }
};
