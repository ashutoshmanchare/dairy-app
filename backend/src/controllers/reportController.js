import { pool } from "../config/db.js";

export const getSummary = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    
    // Today's Milk and Amount
    const [[todayMilk]] = await pool.query(
      "SELECT COALESCE(SUM(quantity), 0) AS totalMilk, COALESCE(SUM(total_amount), 0) AS totalAmount FROM milk_collections WHERE entry_date = ?",
      [today]
    );

    // Total Farmers
    const [[farmers]] = await pool.query("SELECT COUNT(*) AS totalFarmers FROM customers WHERE status = 'active'");

    // Total Bill amount vs Total Payouts to calculate Pending Payments
    const [[milkTotal]] = await pool.query("SELECT COALESCE(SUM(total_amount), 0) AS grossAmount FROM milk_collections");
    const [[paymentTotal]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS paidAmount FROM payments");
    const pendingPayment = Math.max(0, Number(milkTotal.grossAmount) - Number(paymentTotal.paidAmount));

    // Dashboard Analytics (shifts, animal types)
    const [[cowMilk]] = await pool.query(
      "SELECT COALESCE(SUM(quantity), 0) AS qty FROM milk_collections WHERE animal_type = 'cow' AND entry_date = ?", [today]
    );
    const [[buffaloMilk]] = await pool.query(
      "SELECT COALESCE(SUM(quantity), 0) AS qty FROM milk_collections WHERE animal_type = 'buffalo' AND entry_date = ?", [today]
    );
    const [[morningMilk]] = await pool.query(
      "SELECT COALESCE(SUM(quantity), 0) AS qty FROM milk_collections WHERE shift = 'morning' AND entry_date = ?", [today]
    );
    const [[eveningMilk]] = await pool.query(
      "SELECT COALESCE(SUM(quantity), 0) AS qty FROM milk_collections WHERE shift = 'evening' AND entry_date = ?", [today]
    );

    return res.status(200).json({
      todayMilk: Number(todayMilk.totalMilk),
      todayAmount: Number(todayMilk.totalAmount),
      pendingPayment,
      totalFarmers: Number(farmers.totalFarmers),
      cowMilk: Number(cowMilk.qty),
      buffaloMilk: Number(buffaloMilk.qty),
      morningMilk: Number(morningMilk.qty),
      eveningMilk: Number(eveningMilk.qty)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load summary", error: error.message });
  }
};

export const getDailyReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT entry_date AS date, SUM(quantity) AS totalQuantity, SUM(total_amount) AS totalAmount
      FROM milk_collections
    `;
    const params = [];
    if (startDate && endDate) {
      query += " WHERE entry_date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }
    query += " GROUP BY entry_date ORDER BY entry_date DESC LIMIT 30";

    const [rows] = await pool.query(query, params);
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load daily report", error: error.message });
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
  } catch (error) {
    return res.status(500).json({ message: "Failed to load monthly report", error: error.message });
  }
};

export const getCustomerReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT c.id AS customerId, c.name AS customerName, c.farmer_code AS farmerCode,
             COALESCE(SUM(m.quantity), 0) AS totalQuantity,
             COALESCE(SUM(m.total_amount), 0) AS billAmount
      FROM customers c
      LEFT JOIN milk_collections m ON m.customer_id = c.id
    `;
    const params = [];
    if (startDate && endDate) {
      query += " AND m.entry_date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }
    query += " GROUP BY c.id, c.name, c.farmer_code ORDER BY CAST(c.farmer_code AS UNSIGNED) ASC";

    const [rows] = await pool.query(query, params);

    // Calculate paid amount and net pending amount for each customer
    const reportData = [];
    for (const row of rows) {
      const [[paymentRow]] = await pool.query(
        "SELECT COALESCE(SUM(amount), 0) AS paidAmount FROM payments WHERE customer_id = ?",
        [row.customerId]
      );
      const paid = Number(paymentRow.paidAmount);
      reportData.push({
        ...row,
        totalQuantity: Number(row.totalQuantity),
        billAmount: Number(row.billAmount),
        paidAmount: paid,
        pendingAmount: Number(row.billAmount) - paid
      });
    }

    return res.status(200).json(reportData);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load customer report", error: error.message });
  }
};
