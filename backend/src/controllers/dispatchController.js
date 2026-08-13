import { pool } from "../config/db.js";

// Get all dispatches
export const getDispatches = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, dispatch_date AS dispatchDate, shift, vehicle_no AS vehicleNo, 
              tanker_no AS tankerNo, quantity, fat, snf, status 
       FROM milk_dispatches 
       ORDER BY dispatch_date DESC, id DESC`
    );
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch dispatches", error: error.message });
  }
};

// Create a new dispatch
export const createDispatch = async (req, res) => {
  try {
    const { dispatchDate, shift, vehicleNo, tankerNo, quantity, fat, snf } = req.body;
    if (!dispatchDate || !shift || !quantity || !fat || !snf) {
      return res.status(400).json({ message: "Date, shift, quantity, FAT, and SNF are required" });
    }

    const [result] = await pool.query(
      `INSERT INTO milk_dispatches (dispatch_date, shift, vehicle_no, tanker_no, quantity, fat, snf, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'dispatched')`,
      [dispatchDate, shift, vehicleNo || "", tankerNo || "", quantity, fat, snf]
    );

    return res.status(201).json({
      id: result.insertId,
      dispatchDate,
      shift,
      vehicleNo,
      tankerNo,
      quantity,
      fat,
      snf,
      status: "dispatched",
      message: "Milk dispatch recorded successfully"
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to record dispatch", error: error.message });
  }
};

// Delete a dispatch record
export const deleteDispatch = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM milk_dispatches WHERE id = ?", [id]);
    return res.status(200).json({ message: "Dispatch record deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete dispatch", error: error.message });
  }
};
