import { Router } from "express";
import { createOrder, getOrderById } from "../controllers/orders.controller";

const router = Router();

router.post("/orders", createOrder);
router.get("/orders/:id", getOrderById);

export default router;