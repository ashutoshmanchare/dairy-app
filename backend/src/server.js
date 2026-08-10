import "dotenv/config";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import milkRoutes from "./routes/milkRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/milk", milkRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reports", reportRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const start = async () => {
  await connectDB();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`LAN access: http://<your-pc-ip>:${PORT}`);
  });
};

start();
