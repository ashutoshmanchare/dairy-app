import { pool } from "../config/db.js";

// Add new feed item or update stock
export const createFeedItem = async (req, res) => {
  try {
    const { name, price, stockQuantity, unit } = req.body;
    if (!name || price === undefined || stockQuantity === undefined || !unit) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const [result] = await pool.query(
      "INSERT INTO feed_items (name, price, stock_quantity, unit) VALUES (?, ?, ?, ?)",
      [name, price, stockQuantity, unit]
    );

    return res.status(201).json({ id: result.insertId, name, price, stockQuantity, unit });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create feed item", error: error.message });
  }
};

// Get feed items
export const getFeedItems = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, price, stock_quantity AS stockQuantity, unit FROM feed_items ORDER BY id DESC");
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch feed items", error: error.message });
  }
};

// Record feed sale to a farmer
export const recordFeedSale = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { customerId, feedItemId, quantity, saleDate } = req.body;
    if (!customerId || !feedItemId || !quantity || !saleDate) {
      await conn.rollback();
      return res.status(400).json({ message: "Customer, item, quantity, and date are required" });
    }

    // Check item price and stock
    const [items] = await conn.query("SELECT price, stock_quantity FROM feed_items WHERE id = ?", [feedItemId]);
    if (items.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Feed item not found" });
    }

    const item = items[0];
    if (Number(item.stock_quantity) < Number(quantity)) {
      await conn.rollback();
      return res.status(400).json({ message: "Insufficient stock" });
    }

    const rate = Number(item.price);
    const totalAmount = rate * Number(quantity);

    // Record sale
    const [result] = await conn.query(
      `INSERT INTO feed_sales (customer_id, feed_item_id, quantity, rate, total_amount, sale_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [customerId, feedItemId, quantity, rate, totalAmount, saleDate]
    );

    // Deduct stock
    await conn.query(
      "UPDATE feed_items SET stock_quantity = stock_quantity - ? WHERE id = ?",
      [quantity, feedItemId]
    );

    // Auto-record this feed sale as a deduction for this farmer
    await conn.query(
      `INSERT INTO deductions (customer_id, type, amount, deduction_date, notes)
       VALUES (?, 'feed', ?, ?, ?)`,
      [customerId, totalAmount, saleDate, `Feed purchase: ${quantity} bags/units`]
    );

    await conn.commit();
    return res.status(201).json({ id: result.insertId, customerId, feedItemId, quantity, rate, totalAmount, saleDate });
  } catch (error) {
    await conn.rollback();
    return res.status(500).json({ message: "Failed to record feed sale", error: error.message });
  } finally {
    conn.release();
  }
};

// Get feed sales list
export const getFeedSales = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.id, s.customer_id AS customerId, c.name AS customerName, c.farmer_code AS farmerCode,
             s.feed_item_id AS feedItemId, f.name AS feedItemName, s.quantity, s.rate, s.total_amount AS totalAmount,
             s.sale_date AS saleDate
      FROM feed_sales s
      JOIN customers c ON c.id = s.customer_id
      JOIN feed_items f ON f.id = s.feed_item_id
      ORDER BY s.sale_date DESC, s.id DESC
    `);
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch feed sales", error: error.message });
  }
};
