import { pool } from "../config/db.js";

// Get all rate charts
export const getRateCharts = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, animal_type AS animalType, calculation_type AS calculationType,
             fixed_rate AS fixedRate, base_fat AS baseFat, base_snf AS baseSnf,
             base_rate AS baseRate, effective_from AS effectiveFrom, is_active AS isActive
      FROM rate_charts 
      ORDER BY effective_from DESC, id DESC
    `);
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch rate charts", error: error.message });
  }
};

// Create a new rate chart
export const createRateChart = async (req, res) => {
  try {
    const { name, animalType, calculationType, fixedRate, baseFat, baseSnf, baseRate, effectiveFrom, matrix } = req.body;
    if (!name || !animalType || !calculationType || !effectiveFrom) {
      return res.status(400).json({ message: "Name, animal type, calculation type, and effective date are required" });
    }

    const [result] = await pool.query(
      `INSERT INTO rate_charts (name, animal_type, calculation_type, fixed_rate, base_fat, base_snf, base_rate, effective_from, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [name, animalType, calculationType, fixedRate, baseFat, baseSnf, baseRate, effectiveFrom]
    );

    const chartId = result.insertId;

    // If matrix rates are provided (array of { fat, snf, rate })
    if (matrix && Array.isArray(matrix) && matrix.length > 0) {
      const values = matrix.map(item => [chartId, item.fat, item.snf, item.rate]);
      await pool.query(
        "INSERT INTO rate_chart_matrix (rate_chart_id, fat, snf, rate) VALUES ?",
        [values]
      );
    }

    return res.status(201).json({ id: chartId, message: "Rate chart created successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create rate chart", error: error.message });
  }
};

// Set a rate chart as active
export const setActiveRateChart = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    
    // Find the chart to check its animal type
    const [charts] = await conn.query("SELECT animal_type FROM rate_charts WHERE id = ?", [id]);
    if (charts.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Rate chart not found" });
    }
    
    const animalType = charts[0].animal_type;

    // Deactivate all rate charts of this animal type
    await conn.query("UPDATE rate_charts SET is_active = 0 WHERE animal_type = ?", [animalType]);
    
    // Activate this chart
    await conn.query("UPDATE rate_charts SET is_active = 1 WHERE id = ?", [id]);

    await conn.commit();
    return res.status(200).json({ message: `Rate chart activated for ${animalType}` });
  } catch (error) {
    await conn.rollback();
    return res.status(500).json({ message: "Failed to activate rate chart", error: error.message });
  } finally {
    conn.release();
  }
};

// Calculate rate utility function
export const calculateRateHelper = async (animalType, fat, snf) => {
  // Find active rate chart for this animal type
  const [charts] = await pool.query(
    "SELECT * FROM rate_charts WHERE animal_type = ? AND is_active = 1 LIMIT 1",
    [animalType]
  );
  
  if (charts.length === 0) {
    // Return a default rate based on typical Indian standards if no chart is active
    // Cow standard: ₹35/L, Buffalo standard: ₹55/L
    return animalType === "cow" ? 35.00 : 55.00;
  }

  const chart = charts[0];

  if (chart.calculation_type === "fixed") {
    return Number(chart.fixed_rate || 0);
  }

  if (chart.calculation_type === "fat_only") {
    const baseFat = Number(chart.base_fat || 3.5);
    const baseRate = Number(chart.base_rate || 30.00);
    return Number(((fat / baseFat) * baseRate).toFixed(2));
  }

  if (chart.calculation_type === "fat_snf") {
    // 1. Try to look up in the matrix first
    const [matrixRows] = await pool.query(
      "SELECT rate FROM rate_chart_matrix WHERE rate_chart_id = ? AND fat = ? AND snf = ? LIMIT 1",
      [chart.id, fat, snf]
    );
    if (matrixRows.length > 0) {
      return Number(matrixRows[0].rate);
    }

    // 2. If not found in matrix, use base formula
    const baseRate = Number(chart.base_rate || 35.00);
    const baseFat = Number(chart.base_fat || 3.5);
    const baseSnf = Number(chart.base_snf || 8.5);
    
    const fatDiff = (fat - baseFat) * 10;
    const snfDiff = (snf - baseSnf) * 10;
    
    const fatInc = animalType === "cow" ? 0.30 : 0.50;
    const snfInc = animalType === "cow" ? 0.20 : 0.30;

    const rate = baseRate + (fatDiff * fatInc) + (snfDiff * snfInc);
    return Number(Math.max(10, rate).toFixed(2));
  }

  return animalType === "cow" ? 35.00 : 55.00;
};

// Calculate rate endpoint
export const calculateRate = async (req, res) => {
  try {
    const { animalType, fat, snf } = req.body;
    if (!animalType || fat === undefined || snf === undefined) {
      return res.status(400).json({ message: "Animal type, FAT, and SNF are required" });
    }
    const rate = await calculateRateHelper(animalType, Number(fat), Number(snf));
    return res.status(200).json({ rate });
  } catch (error) {
    return res.status(500).json({ message: "Failed to calculate rate", error: error.message });
  }
};
