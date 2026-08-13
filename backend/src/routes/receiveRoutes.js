import { Router } from "express";
import { getReceives, createReceive, deleteReceive } from "../controllers/receiveController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/", getReceives);
router.post("/", createReceive);
router.delete("/:id", deleteReceive);

export default router;
