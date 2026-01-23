import request from "supertest";
import app from "../app";
import { prisma } from "../prisma";

let keyboardId: number;
let mouseId: number;

beforeAll(async () => {
  // Clean database in correct order (FK constraints)
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();

  // Create products and capture real IDs
  const keyboard = await prisma.product.create({
    data: {
      name: "Keyboard",
      price: 100,
      stock: 10,
    },
  });

  const mouse = await prisma.product.create({
    data: {
      name: "Mouse",
      price: 50,
      stock: 5,
    },
  });

  keyboardId = keyboard.id;
  mouseId = mouse.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/orders", () => {
  it("creates an order successfully", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({
        items: [
          { productId: keyboardId, quantity: 2 },
          { productId: mouseId, quantity: 1 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("items");
    expect(res.body.items.length).toBe(2);
  });

  it("fails when stock is insufficient", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({
        items: [{ productId: mouseId, quantity: 999 }],
      });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toBe("Failed to create order");
  });
});