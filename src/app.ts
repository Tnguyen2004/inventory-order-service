import express from 'express';
import { prisma } from './prisma';

const app = express();

app.use(express.json());

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})