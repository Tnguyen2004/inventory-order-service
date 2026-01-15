import { Request, Response } from 'express';
import { prisma } from '../prisma';

// Controller to create a new product
export async function createProduct(req: Request, res: Response) {
    // Extract product details from request body
    const { name, price, stock } = req.body;

    // Input validation
    if (!name || price == null || stock == null) {
        return res.status(400).json({ error: 'Name, price, and stock are required.' });
    }

    if (typeof price !== 'number' || typeof stock !== 'number') {
        return res.status(400).json({ error: 'Price and stock must be numbers.' });
    }

    if (price < 0 || stock < 0) {
        return res.status(400).json({ error: 'Price and stock must be non-negative.' });
    }

    // Create the new product in the database
    try {
        const newProduct = await prisma.product.create({
            data: {
                name,
                price,
                stock,
            },
        });

        res.status(201).json(newProduct);
    } catch (error) {
        console.error("Error creating product:", error instanceof Error ? error.message : error);
        return res.status(500).json({ error: 'Failed to create product.' });
    }
}

// Controller to get all products
export async function getProducts(req: Request, res: Response) {
    try {
        const products = await prisma.product.findMany();

        if (products.length === 0) {
            return res.status(200).json({ message: 'No products found.' });
        }

        res.status(200).json(products);
    } catch (error) {
        console.error("Error retrieving products:", error instanceof Error ? error.message : error);
        return res.status(500).json({ error: 'Failed to retrieve products.' });
    }
}

// Controller to get a product by ID
export async function getProductById(req: Request, res: Response) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid product ID.' });
    }

    if (id <= 0) {
        return res.status(400).json({ error: 'Product ID must be a positive integer.' });
    }

    try {
        const product = await prisma.product.findUnique({
            where: { id },
        })

        if (!product) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        res.status(200).json(product);
    } catch (error) {
        console.error("Error retrieving product:", error instanceof Error ? error.message : error);
        return res.status(500).json({ error: 'Failed to retrieve product.' });
    }
}