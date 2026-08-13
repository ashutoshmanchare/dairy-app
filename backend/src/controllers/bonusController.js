import { pool } from "../config/db.js";

// Get calculated bonuses for a specific year
export const getBonuses = async (req, res) => {
  try {
    const { year } = req.query;
    if (!year) {
      return res.status(400).json({ message: "Year is required" });
    }

    const [rows] = await pool.query(
      `SELECT b.id, b.customer_id AS customerId, c.name AS customerName, c.farmer_code AS farmerCode, 
              b.year, b.total_milk AS totalMilk, b.bonus_rate AS bonusRate, b.bonus_amount AS bonusAmount, b.status 
       FROM bonuses b
       JOIN customers c ON b.customer_id = c.id
       WHERE b.year = ?
       ORDER BY c.farmer_code ASC`,
      [year]
    );
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch bonuses", error: error.message });
  }
};

// Calculate and generate bonuses for a specific year
export const calculateBonus = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { year, bonusRate } = req.body;
    if (!year || !bonusRate) {
      await conn.rollback();
      return res.status(400).json({ message: "Year and bonus rate are required" });
    }

    // 1. Get sum of milk quantity for all customers during that year
    const [aggregates] = await conn.query(
      `SELECT customer_id, SUM(quantity) AS totalMilk
       FROM milk_collections
       WHERE YEAR(entry_date) = ?
       GROUP BY customer_id`,
      [year]
    );

    if (aggregates.length === 0) {
      await conn.rollback();
      return res.status(400).json({ message: "No milk collections found for the selected year" });
    }

    // 2. Insert or update bonus entries
    for (const row of aggregates) {
      const customerId = row.customer_id;
      const totalMilk = Number(row.totalMilk || 0);
      const bonusAmount = totalMilk * Number(bonusRate);

      // Check if bonus record already exists for this customer + year
      const [existing] = await conn.query(
        "SELECT id FROM bonuses WHERE customer_id = ? AND year = ?",
        [customerId, year]
      );

      if (existing.length > 0) {
        // Update
        await conn.query(
          "UPDATE bonuses SET total_milk = ?, bonus_rate = ?, bonus_amount = ? WHERE id = ?",
          [totalMilk, bonusRate, bonusAmount, existing[0].id]
        );
      } else {
        // Insert
        await conn.query(
          `INSERT INTO bonuses (customer_id, year, total_milk, bonus_rate, bonus_amount, status)
           VALUES (?, ?, ?, ?, ?, 'pending')`,
          [customerId, year, totalMilk, bonusRate, bonusAmount]
        );
      }
    }

    await conn.commit();
    return res.status(201).json({ message: `Annual bonus calculations generated successfully for ${year}` });
  } catch (error) {
    await conn.rollback();
    return res.status(500).json({ message: "Failed to calculate bonuses", error: error.message });
  } finally {
    conn.release();
  }
};

// Update bonus payment status
export const markBonusPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'paid' or 'pending'
    await pool.query("UPDATE bonuses SET status = ? WHERE id = ?", [status, id]);
    return res.status(200).json({ message: "Bonus payment status updated" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update bonus status", error: error.message });
  }
};
