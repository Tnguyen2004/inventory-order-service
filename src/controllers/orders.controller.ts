import { Request, Response } from "express";
import {
    createOrder as createOrderService,
    getOrderById as getOrderByIdService,
} from "../services/order.service";

export async function createOrder(req: Request, res: Response) {
    const orderItems = req.body.items;
    // Validate request body
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
        return res.status(400).json({ error: "Order must contain at least one item." });
    }

    // Validate each order item
    for (const item of orderItems) {
        if (
            !item.productId ||
            !item.quantity ||
            item.quantity < 1
        ) {
            return res.status(400).json({ error: "Each order item must have a valid productId and quantity." });
        }
    }

    try {
        const newOrder = await createOrderService(orderItems);

        res.status(201).json(newOrder);
    } catch (error) {
        console.error("Error creating order:", error instanceof Error ? error.message : error);
        res.status(500).json({ error: "Failed to create order" });
    }
}

export const getOrderById = async (req: Request, res: Response) => {
    const orderId = Number(req.params.id);

    if (isNaN(orderId)) {
        return res.status(400).json({ error: "Invalid order ID" });
    }

    try {
        const order = await getOrderByIdService(orderId);

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        const total = order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

        res.status(200).json({ ...order, total });
    } catch (error) {
        console.error("Error fetching order:", error instanceof Error ? error.message : error);
        res.status(500).json({ error: "Failed to fetch order" });
    }
}