import { Router } from "express";
import {
  createDeduction,
  getDeductions
} from "../controllers/deductionController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/", getDeductions);
router.post("/", createDeduction);

export default router;
