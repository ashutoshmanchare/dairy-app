import { Router } from "express";
import { createPayment, getPayments } from "../controllers/paymentController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/", getPayments);
router.post("/", createPayment);

export default router;
