import { Router } from "express";
import {
  createFeedItem,
  getFeedItems,
  recordFeedSale,
  getFeedSales
} from "../controllers/feedController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/items", getFeedItems);
router.post("/items", createFeedItem);
router.get("/sales", getFeedSales);
router.post("/sales", recordFeedSale);

export default router;
