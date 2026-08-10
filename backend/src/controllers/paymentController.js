import { pool } from "../config/db.js";
import { sendSMS } from "../utils/smsService.js";

// Fetch all recorded payments
export const getPayments = async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.id, p.customer_id AS customerId, c.name AS customerName, c.farmer_code AS farmerCode,
             p.payment_date AS paymentDate, p.amount, p.status, p.notes
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      ORDER BY p.payment_date DESC, p.id DESC
    `);
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch payments", error: error.message });
  }
};

// Calculate net payout details before saving
export const calculatePaymentSummary = async (req, res) => {
  try {
    const { customerId, startDate, endDate } = req.body;
    if (!customerId || !startDate || !endDate) {
      return res.status(400).json({ message: "Customer ID, start date, and end date are required" });
    }

    // 1. Calculate Gross Milk Amount
    const [milkRows] = await pool.query(
      `SELECT COALESCE(SUM(quantity), 0) AS totalQuantity, 
              COALESCE(SUM(total_amount), 0) AS grossAmount 
       FROM milk_collections 
       WHERE customer_id = ? AND entry_date BETWEEN ? AND ?`,
      [customerId, startDate, endDate]
    );

    // 2. Fetch Pending Advances
    const [advanceRows] = await pool.query(
      `SELECT COALESCE(SUM(amount - recovered_amount), 0) AS outstandingAdvance 
       FROM advances 
       WHERE customer_id = ?`,
      [customerId]
    );

    // 3. Fetch Unrecovered Deductions
    const [deductionRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS totalDeductions 
       FROM deductions 
       WHERE customer_id = ? AND is_recovered = 0 AND deduction_date BETWEEN ? AND ?`,
      [customerId, startDate, endDate]
    );

    const grossAmount = Number(milkRows[0].grossAmount);
    const totalQuantity = Number(milkRows[0].totalQuantity);
    const outstandingAdvance = Number(advanceRows[0].outstandingAdvance);
    const totalDeductions = Number(deductionRows[0].totalDeductions);

    // Auto-recover portion of outstanding advance up to remaining gross amount
    const advanceRecovery = Math.min(outstandingAdvance, Math.max(0, grossAmount - totalDeductions));
    const netAmount = Math.max(0, grossAmount - totalDeductions - advanceRecovery);

    return res.status(200).json({
      totalQuantity,
      grossAmount,
      outstandingAdvance,
      advanceRecovery,
      totalDeductions,
      netAmount
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to calculate payment summary", error: error.message });
  }
};

// Record payment and update balances
export const createPayment = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { customerId, paymentDate, amount, status = "paid", notes = "", startDate, endDate, advanceRecovery = 0 } = req.body;
    
    if (!customerId || !paymentDate || !amount) {
      await conn.rollback();
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Insert payment record
    const [result] = await conn.query(
      "INSERT INTO payments (customer_id, payment_date, amount, status, notes) VALUES (?, ?, ?, ?, ?)",
      [customerId, paymentDate, amount, status, notes]
    );

    const paymentId = result.insertId;

    // Apply advance recovery
    if (Number(advanceRecovery) > 0) {
      let remainingRecovery = Number(advanceRecovery);
      const [advances] = await conn.query(
        "SELECT id, amount, recovered_amount FROM advances WHERE customer_id = ? AND amount > recovered_amount ORDER BY advance_date ASC",
        [customerId]
      );
      
      for (const adv of advances) {
        if (remainingRecovery <= 0) break;
        const outstanding = adv.amount - adv.recovered_amount;
        const apply = Math.min(remainingRecovery, outstanding);
        
        await conn.query(
          "UPDATE advances SET recovered_amount = recovered_amount + ? WHERE id = ?",
          [apply, adv.id]
        );
        remainingRecovery -= apply;
      }
    }

    // Mark deductions in the date range as recovered
    if (startDate && endDate) {
      await conn.query(
        "UPDATE deductions SET is_recovered = 1 WHERE customer_id = ? AND deduction_date BETWEEN ? AND ?",
        [customerId, startDate, endDate]
      );
    }

    // Send SMS Notification
    try {
      const [customerRows] = await conn.query("SELECT name, mobile FROM customers WHERE id = ?", [customerId]);
      if (customerRows.length > 0 && customerRows[0].mobile) {
        const customer = customerRows[0];
        const formattedDate = new Date(paymentDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric"
        });
        const message = `Dear ${customer.name}, Payment Recorded: Amount: ₹${Number(amount).toFixed(2)} on ${formattedDate}. Status: ${status.toUpperCase()}. Thank you! - DairyPro`;
        sendSMS(customer.mobile, message).catch(err =>
          console.error("[SMS Error] Failed to send payment SMS:", err.message)
        );
      }
    } catch (smsErr) {
      console.error("[SMS Error] Failed to send payout SMS:", smsErr.message);
    }

    await conn.commit();
    return res.status(201).json({ id: paymentId, customerId, paymentDate, amount, status, notes });
  } catch (error) {
    await conn.rollback();
    return res.status(500).json({ message: "Failed to record payment", error: error.message });
  } finally {
    conn.release();
  }
};
