import { Router } from 'express';
import {
    createProduct,
    getProducts,
    getProductById,
} from '../controllers/products.controller';

// Define product-related routes
const router = Router();

// Product routes
router.post('/products', createProduct);
router.get('/products', getProducts);
router.get('/products/:id', getProductById);

// Export the router
export default router;

