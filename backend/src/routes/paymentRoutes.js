import { Router } from "express";
import { createPayment, getPayments, calculatePaymentSummary } from "../controllers/paymentController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/", getPayments);
router.post("/", createPayment);
router.post("/calculate", calculatePaymentSummary);

export default router;
