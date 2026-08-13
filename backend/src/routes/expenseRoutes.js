import { Router } from "express";
import { getExpenses, createExpense, deleteExpense } from "../controllers/expenseController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/", getExpenses);
router.post("/", createExpense);
router.delete("/:id", deleteExpense);

export default router;
