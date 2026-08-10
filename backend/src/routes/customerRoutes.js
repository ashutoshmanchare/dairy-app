import { Router } from "express";
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer
} from "../controllers/customerController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/", getCustomers);
router.post("/", createCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

export default router;
