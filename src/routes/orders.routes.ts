import { Router } from "express";
import { createOrder } from "../controllers/orders.controller";

const router = Router();

router.post("/orders", createOrder);

export default router;