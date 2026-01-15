import { Request, Response } from "express";
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
            res.status(400).json({})
        }
    }

    // Verify that all products exist
    const productIds = orderItems.map((i) => i.productId);
    const products = await prisma.product.findMany({
        where: { id: {in: productIds }}
    })

    if (products.length !== productIds.length) {
        return res.status(400).json({ error: "One or more products not found" });
    }

    try {
        // Create the new order in the database
        const newOrder = await prisma.order.create({
            data: {
                items: {
                    create: orderItems.map((item) => {
                        const product = products.find((p) => {
                            return p.id === item.productId;
                        })!; // non-null assertion

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

        res.status(201).json(newOrder);
    } catch (error) {
        res.status(500).json({ error: "An error occurred while creating the order.", details: error });
    }
}