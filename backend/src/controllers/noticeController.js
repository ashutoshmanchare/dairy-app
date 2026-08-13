import { pool } from "../config/db.js";

// Get all notices (active or all depending on filter)
export const getNotices = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, title, content, notice_date AS noticeDate, is_active AS isActive FROM notices ORDER BY notice_date DESC, id DESC"
    );
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch notices", error: error.message });
  }
};

// Create a new notice
export const createNotice = async (req, res) => {
  try {
    const { title, content, noticeDate } = req.body;
    if (!title || !content || !noticeDate) {
      return res.status(400).json({ message: "Title, content, and date are required" });
    }

    const [result] = await pool.query(
      `INSERT INTO notices (title, content, notice_date, is_active)
       VALUES (?, ?, ?, 1)`,
      [title, content, noticeDate]
    );

    return res.status(201).json({
      id: result.insertId,
      title,
      content,
      noticeDate,
      isActive: 1,
      message: "Notice published successfully"
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to publish notice", error: error.message });
  }
};

// Toggle active status of a notice
export const toggleNoticeActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    await pool.query("UPDATE notices SET is_active = ? WHERE id = ?", [isActive ? 1 : 0, id]);
    return res.status(200).json({ message: "Notice status updated" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update notice", error: error.message });
  }
};

// Delete a notice
export const deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM notices WHERE id = ?", [id]);
    return res.status(200).json({ message: "Notice deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete notice", error: error.message });
  }
};
