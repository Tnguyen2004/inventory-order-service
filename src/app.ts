import express from 'express';
import { prisma } from './prisma';
import productRoutes from './routes/products.routes';
import orderRoutes from './routes/orders.routes';

// Initialize Express app
const app = express();
app.use(express.json());

// Health check endpoints
app.get('/health', (req, res) => {
    res.status(200).send({ status: 'OK' });
})

app.get('/health/db', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).send({ database: 'OK' });
    } catch (error) {
        res.status(500).send({ database: 'ERROR', details: error });
    }
});

// Use product routes
app.use('/api', productRoutes);

// Use order routes
app.use('/api', orderRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})