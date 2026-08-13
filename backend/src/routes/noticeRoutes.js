import { Router } from "express";
import { getNotices, createNotice, toggleNoticeActive, deleteNotice } from "../controllers/noticeController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/", getNotices);
router.post("/", createNotice);
router.put("/:id/active", toggleNoticeActive);
router.delete("/:id", deleteNotice);

export default router;
