import express from 'express';
import { prisma } from './prisma';
import productRoutes from './routes/products.routes';
import orderRoutes from './routes/orders.routes';
import { logger } from './config/logger';
import { requestLogger } from './middleware/requestLogger';

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

// Apply request logging middleware
app.use(requestLogger);

// Start the server
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);
    });
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;