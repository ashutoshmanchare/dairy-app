import { Router } from "express";
import {
  createEntry,
  deleteEntry,
  getEntries,
  getEntryById,
  updateEntry
} from "../controllers/entryController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", getEntries);
router.get("/:id", getEntryById);
router.post("/", createEntry);
router.put("/:id", updateEntry);
router.delete("/:id", deleteEntry);

export default router;
