import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";

const generateToken = (userId, role) =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

export const register = async (req, res) => {
  try {
    const { name, username, password, role = "user" } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const [existing] = await pool.query("SELECT id FROM users WHERE username = ?", [username]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "Username already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)",
      [name, username, hashedPassword, role === "admin" ? "admin" : "user"]
    );

    const userRole = role === "admin" ? "admin" : "user";
    const token = generateToken(result.insertId, userRole);
    return res.status(201).json({
      token,
      user: { id: result.insertId, name, username, role: userRole }
    });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed" });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const [rows] = await pool.query(
      "SELECT id, name, username, password, role FROM users WHERE username = ?",
      [username]
    );
    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const user = rows[0];

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user.id, user.role);
    return res.status(200).json({
      token,
      user: { id: user.id, name: user.name, username: user.username, role: user.role }
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed" });
  }
};

export const getMe = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, username, role, created_at AS createdAt FROM users WHERE id = ?",
      [req.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch user profile" });
  }
};
