import { prisma } from "../prisma";

// Service to create a new product
export async function createProduct (
    name: string,
    price: number,
    stock: number
) {
    return prisma.product.create({
        data: {
            name,
            price,
            stock,
        },
    })
}

// Service to list products with pagination
export async function getProducts (
    page: number,
    limit: number
) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
        prisma.product.findMany({
            skip,
            take: limit,
            orderBy: { id: 'asc' },
        }),
        prisma.product.count(),
    ]);

    return {
        products,
        total,
    };
}

// Service to get a product by ID
export async function getProductById (
    productId: number
) {
    return prisma.product.findUnique({
        where: { id: productId },
    });
}
