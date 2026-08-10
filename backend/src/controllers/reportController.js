import { pool } from "../config/db.js";

export const getSummary = async (_req, res) => {
  try {
    const [[milk]] = await pool.query("SELECT IFNULL(SUM(quantity), 0) AS totalMilk FROM milk_collections");
    const [[todayMilk]] = await pool.query(
      "SELECT IFNULL(SUM(quantity), 0) AS todayMilk FROM milk_collections WHERE entry_date = CURDATE()"
    );
    const [[monthlyMilk]] = await pool.query(
      "SELECT IFNULL(SUM(quantity), 0) AS monthlyMilk FROM milk_collections WHERE YEAR(entry_date)=YEAR(CURDATE()) AND MONTH(entry_date)=MONTH(CURDATE())"
    );
    const [[customers]] = await pool.query("SELECT COUNT(*) AS totalCustomers FROM customers");
    const [[payments]] = await pool.query("SELECT IFNULL(SUM(amount), 0) AS totalPayments FROM payments");
    const [[paidPending]] = await pool.query(`
      SELECT
        IFNULL(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paidAmount,
        IFNULL(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pendingAmount
      FROM payments
    `);

    return res.status(200).json({
      totalMilk: Number(milk.totalMilk),
      todayMilk: Number(todayMilk.todayMilk),
      monthlyMilk: Number(monthlyMilk.monthlyMilk),
      totalCustomers: Number(customers.totalCustomers),
      totalPayments: Number(payments.totalPayments),
      paidAmount: Number(paidPending.paidAmount),
      pendingAmount: Number(paidPending.pendingAmount)
    });
  } catch {
    return res.status(500).json({ message: "Failed to load summary" });
  }
};

export const getDailyReport = async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT entry_date AS date, SUM(quantity) AS totalQuantity, SUM(total_amount) AS totalAmount
      FROM milk_collections
      GROUP BY entry_date
      ORDER BY entry_date DESC
      LIMIT 30
    `);
    return res.status(200).json(rows);
  } catch {
    return res.status(500).json({ message: "Failed to load daily report" });
  }
};

export const getMonthlyReport = async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DATE_FORMAT(entry_date, '%Y-%m') AS month, SUM(quantity) AS totalQuantity, SUM(total_amount) AS totalAmount
      FROM milk_collections
      GROUP BY DATE_FORMAT(entry_date, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
    `);
    return res.status(200).json(rows);
  } catch {
    return res.status(500).json({ message: "Failed to load monthly report" });
  }
};

export const getCustomerReport = async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.id AS customerId, c.name AS customerName,
             IFNULL(SUM(m.quantity), 0) AS totalQuantity,
             IFNULL(SUM(m.total_amount), 0) AS billAmount,
             IFNULL((SELECT SUM(p.amount) FROM payments p WHERE p.customer_id = c.id), 0) AS paidAmount
      FROM customers c
      LEFT JOIN milk_collections m ON m.customer_id = c.id
      GROUP BY c.id, c.name
      ORDER BY c.name ASC
    `);
    return res.status(200).json(
      rows.map((r) => ({
        ...r,
        pendingAmount: Number(r.billAmount) - Number(r.paidAmount)
      }))
    );
  } catch {
    return res.status(500).json({ message: "Failed to load customer report" });
  }
};
