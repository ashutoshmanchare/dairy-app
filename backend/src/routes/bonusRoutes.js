import { Router } from "express";
import { getBonuses, calculateBonus, markBonusPaid } from "../controllers/bonusController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/", getBonuses);
router.post("/calculate", calculateBonus);
router.put("/:id/pay", markBonusPaid);

export default router;
