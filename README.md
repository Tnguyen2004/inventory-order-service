# inventory-order-service

A backend service for managing products, inventory, and orders. Demonstrates database transactions, concurrency control, and testing best practices.

## Tech Stack

- Node.js and TypeScript
- Express
- PostgreSQL
- Prisma
- Docker
- Jest

## Features

- Database transactions for atomic inventory updates
- Concurrency control to prevent overselling
- RESTful API with full test coverage
- Dockerized development environment

## Quick Start

```bash
# Start with Docker
docker compose up

# API available at http://localhost:3000
```

## Example Usage

```bash
# Create a product
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Keyboard","price":89.99,"stock":50}'

# Place an order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"productId":1,"quantity":2}'
```

## API Endpoints

**Products**
- `POST /api/products` - Create product
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product by ID

**Orders**
- `POST /api/orders` - Create order (decrements inventory)
- `GET /api/orders/:id` - Get order by ID

## Running Tests

```bash
npm test
```

## Development Setup

```bash
npm install
npx prisma migrate dev
npm run dev
```

## Docker Commands

```bash
docker compose up        # Start services
docker compose down      # Stop services
docker compose down -v   # Stop and reset database
```