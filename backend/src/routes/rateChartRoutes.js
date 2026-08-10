import { Router } from "express";
import {
  createRateChart,
  getRateCharts,
  setActiveRateChart,
  calculateRate
} from "../controllers/rateChartController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/", getRateCharts);
router.post("/", createRateChart);
router.post("/calculate", calculateRate);
router.put("/:id/activate", setActiveRateChart);

export default router;
