import { Router } from "express";
import {
  getCustomerReport,
  getDailyReport,
  getMonthlyReport,
  getSummary
} from "../controllers/reportController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/summary", getSummary);
router.get("/daily", getDailyReport);
router.get("/monthly", getMonthlyReport);
router.get("/customer", getCustomerReport);

export default router;
