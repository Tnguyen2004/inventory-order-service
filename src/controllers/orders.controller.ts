import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

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
        const newOrder = await prisma.$transaction(async (tx) => {
            // Verify that all products exist
            const productIds = orderItems.map((i) => i.productId);
            const products = await tx.$queryRaw<
                { id: number, price: number, stock: number }[]
            >`
                SELECT id, price, stock
                FROM "Product"
                WHERE id IN (${Prisma.join(productIds)})
                FOR UPDATE
            `; // Lock the selected product rows for update

            if (products.length !== productIds.length) {
                throw new Error("One or more products not found");
            }

            // Create a map for quick access to product details
            const productMap = new Map(products.map(p => [p.id, p]));

            // Check stock availability
            for (const item of orderItems) {
                const product = productMap.get(item.productId)!; // non-null assertion

                if (product.stock < item.quantity) {
                    throw new Error(`Insufficient stock for product ID ${item.productId}`);
                }
            }

            // Check for duplicate product IDs in the order items
            const seen = new Set<number>();
            for (const item of orderItems) {
                if (seen.has(item.productId)) {
                    throw new Error(`Duplicate product ID ${item.productId} in order items`);
                }
                seen.add(item.productId);
            }

            // Decrement stock for each product
            for (const item of orderItems) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: { decrement: item.quantity },
                    },
                });
            }

            // Create the new order in the database
            const newOrder = await tx.order.create({
                data: {
                    items: {
                        create: orderItems.map((item) => {
                            const product = productMap.get(item.productId)!; // non-null assertion

                            return {
                                productId: product.id,
                                quantity: item.quantity,
                                price: product.price,
                            }
                        })
                    }
                },
                include: {
                    items: true,
                }
            })

            return newOrder;
        })

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
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        })

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