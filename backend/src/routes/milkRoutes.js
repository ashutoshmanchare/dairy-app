import { Router } from "express";
import {
  createMilkCollection,
  deleteMilkCollection,
  getMilkCollections
} from "../controllers/milkController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/", getMilkCollections);
router.post("/", createMilkCollection);
router.delete("/:id", deleteMilkCollection);

export default router;
