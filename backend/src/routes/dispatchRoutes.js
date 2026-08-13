import { Router } from "express";
import { getDispatches, createDispatch, deleteDispatch } from "../controllers/dispatchController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/", getDispatches);
router.post("/", createDispatch);
router.delete("/:id", deleteDispatch);

export default router;
