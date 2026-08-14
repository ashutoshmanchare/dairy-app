import { pool } from "../config/db.js";

export const getCustomers = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, mobile, address, farmer_code AS farmerCode, village, 
              bank_details AS bankDetails, default_animal_type AS defaultAnimalType, 
              joining_date AS joiningDate, status, created_at AS createdAt 
       FROM customers 
       ORDER BY CAST(farmer_code AS UNSIGNED) ASC, id DESC`
    );
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch customers", error: error.message });
  }
};

export const createCustomer = async (req, res) => {
  try {
    console.log("createCustomer req.body:", req.body);
    const { name, mobile, address, farmerCode, village, bankDetails, defaultAnimalType = 'cow', joiningDate, status = 'active' } = req.body;
    if (!name || !mobile) {
      return res.status(400).json({ message: "Name and mobile are required" });
    }
    
    // Auto-generate farmer code if not provided
    let finalFarmerCode = farmerCode;
    if (!finalFarmerCode) {
      const [maxCodeRows] = await pool.query("SELECT MAX(CAST(farmer_code AS UNSIGNED)) AS maxCode FROM customers WHERE farmer_code REGEXP '^[0-9]+$'");
      const nextCode = (maxCodeRows[0].maxCode || 0) + 1;
      finalFarmerCode = String(nextCode);
    }

    const [result] = await pool.query(
      `INSERT INTO customers (name, mobile, address, farmer_code, village, bank_details, default_animal_type, joining_date, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, mobile, address || "", finalFarmerCode, village || "", bankDetails || "", defaultAnimalType, joiningDate || new Date().toISOString().slice(0, 10), status]
    );
    
    return res.status(201).json({ 
      id: result.insertId, name, mobile, address, 
      farmerCode: finalFarmerCode, village, bankDetails, 
      defaultAnimalType, joiningDate, status 
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create customer", error: error.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { name, mobile, address, farmerCode, village, bankDetails, defaultAnimalType, joiningDate, status } = req.body;
    const [result] = await pool.query(
      `UPDATE customers 
       SET name = ?, mobile = ?, address = ?, farmer_code = ?, village = ?, 
           bank_details = ?, default_animal_type = ?, joining_date = ?, status = ? 
       WHERE id = ?`,
      [name, mobile, address || "", farmerCode, village || "", bankDetails || "", defaultAnimalType, joiningDate, status, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }
    return res.status(200).json({ 
      id: Number(req.params.id), name, mobile, address, 
      farmerCode, village, bankDetails, defaultAnimalType, 
      joiningDate, status 
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update customer", error: error.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM customers WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }
    return res.status(200).json({ message: "Customer deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete customer", error: error.message });
  }
};
