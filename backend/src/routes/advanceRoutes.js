import { Router } from "express";
import {
  createAdvance,
  getAdvances,
  getCustomerAdvanceSummary
} from "../controllers/advanceController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/", getAdvances);
router.post("/", createAdvance);
router.get("/customer/:customerId/summary", getCustomerAdvanceSummary);

export default router;
