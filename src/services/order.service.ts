import { prisma } from "../prisma";
import { Prisma } from "@prisma/client";

// Service to create a new order
export async function createOrder (
    orderItems: { productId: number; quantity: number }[]
) {
    return prisma.$transaction(async (tx) => {
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
                        };
                    }),
                },
            },
            include: {
                items: true,
            },
        });

        return newOrder;
    });
}

// Service to get an order by ID
export async function getOrderById (
    orderId: number
) {
    return prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
    });
}
    
