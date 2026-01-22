import { Request, Response } from 'express';
import {
    createProduct as createProductService,
    getProducts as getProductsService,
    getProductById as getProductByIdService,
} from '../services/product.service';
import {
    isNonEmptyString,
    isNonNegativeNumber,
    isPositiveInt,
} from '../utils/validation';

// Controller to create a new product
export async function createProduct(req: Request, res: Response) {
    // Extract product details from request body
    const { name, price, stock } = req.body;

    // Input validation
    if (!isNonEmptyString(name)) {
        return res.status(400).json({ error: 'Product name must be a non-empty string.' });
    }
    if (!isNonNegativeNumber(price)) {
        return res.status(400).json({ error: 'Product price must be a non-negative number.' });
    }
    if (!isNonNegativeNumber(stock)) {
        return res.status(400).json({ error: 'Product stock must be a non-negative number.' });
    }

    // Create the new product in the database
    try {
        const newProduct = await createProductService(name, price, stock);

        res.status(201).json(newProduct);
    } catch (error) {
        console.error("Error creating product:", error instanceof Error ? error.message : error);
        return res.status(500).json({ error: 'Failed to create product.' });
    }
}

// Controller to get all products
export async function getProducts(req: Request, res: Response) {
    // Pagination parameters
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    if (!isPositiveInt(page) || !isPositiveInt(limit)) {
        return res.status(400).json({
            error: "page and limit must be positive integers",
        });
    }

    try {
        // Retrieve products with pagination
        const { products, total } = await getProductsService(page, limit);

        // Send response with products and pagination metadata
        res.status(200).json({
            data: products,
            meta: {
                page,
                total,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error retrieving products:", error instanceof Error ? error.message : error);
        return res.status(500).json({ error: 'Failed to retrieve products.' });
    }
}

// Controller to get a product by ID
export async function getProductById(req: Request, res: Response) {
    const id = Number(req.params.id);

    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid product ID.' });
    }

    try {
        const product = await getProductByIdService(id);

        if (!product) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        res.status(200).json(product);
    } catch (error) {
        console.error("Error retrieving product:", error instanceof Error ? error.message : error);
        return res.status(500).json({ error: 'Failed to retrieve product.' });
    }
}