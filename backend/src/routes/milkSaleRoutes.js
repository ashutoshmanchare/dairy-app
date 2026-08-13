import { Router } from "express";
import { getMilkSales, createMilkSale, deleteMilkSale } from "../controllers/milkSaleController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/", getMilkSales);
router.post("/", createMilkSale);
router.delete("/:id", deleteMilkSale);

export default router;
