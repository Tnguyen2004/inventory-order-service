import request from "supertest";
import app from "../app";
import { prisma } from "../prisma";

let keyboardId: number;
let mouseId: number;
let monitorId: number;

async function resetProducts() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();

  const keyboard = await prisma.product.create({
    data: { name: "Keyboard", price: 100, stock: 10 },
  });
  const mouse = await prisma.product.create({
    data: { name: "Mouse", price: 50, stock: 5 },
  });
  const monitor = await prisma.product.create({
    data: { name: "Monitor", price: 300, stock: 3 },
  });

  keyboardId = keyboard.id;
  mouseId = mouse.id;
  monitorId = monitor.id;
}

beforeAll(async () => {
  await resetProducts();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function getStock(id: number) {
  const p = await prisma.product.findUnique({ where: { id } });
  return p!.stock;
}

async function orderCount() {
  return prisma.order.count();
}

describe("Transaction rollback behavior", () => {
  beforeEach(async () => {
    await resetProducts();
  });

  it("rolls back stock decrement when a later item has insufficient stock", async () => {
    const keyboardStockBefore = await getStock(keyboardId);
    const mouseStockBefore = await getStock(mouseId);
    const ordersBefore = await orderCount();

    const res = await request(app)
      .post("/api/orders")
      .send({
        items: [
          { productId: keyboardId, quantity: 3 },
          { productId: mouseId, quantity: 999 },
        ],
      });

    expect(res.status).toBe(500);
    expect(await getStock(keyboardId)).toBe(keyboardStockBefore);
    expect(await getStock(mouseId)).toBe(mouseStockBefore);
    expect(await orderCount()).toBe(ordersBefore);
  });

  it("rolls back entirely when a product in the order does not exist", async () => {
    const keyboardStockBefore = await getStock(keyboardId);
    const ordersBefore = await orderCount();

    const res = await request(app)
      .post("/api/orders")
      .send({
        items: [
          { productId: keyboardId, quantity: 1 },
          { productId: 999999, quantity: 1 },
        ],
      });

    expect(res.status).toBe(500);
    expect(await getStock(keyboardId)).toBe(keyboardStockBefore);
    expect(await orderCount()).toBe(ordersBefore);
  });

  it("rolls back when duplicate product IDs are present in the same order", async () => {
    const keyboardStockBefore = await getStock(keyboardId);
    const ordersBefore = await orderCount();

    const res = await request(app)
      .post("/api/orders")
      .send({
        items: [
          { productId: keyboardId, quantity: 1 },
          { productId: keyboardId, quantity: 2 },
        ],
      });

    expect(res.status).toBe(500);
    expect(await getStock(keyboardId)).toBe(keyboardStockBefore);
    expect(await orderCount()).toBe(ordersBefore);
  });
});

describe("Race condition handling", () => {
  beforeEach(async () => {
    await resetProducts();
  });

  it("prevents overselling when two orders race for the last units of stock", async () => {
    // monitor has stock = 3; two parallel requests each asking for 2 -> only one may succeed
    const [resA, resB] = await Promise.all([
      request(app)
        .post("/api/orders")
        .send({ items: [{ productId: monitorId, quantity: 2 }] }),
      request(app)
        .post("/api/orders")
        .send({ items: [{ productId: monitorId, quantity: 2 }] }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 500]);

    const stock = await getStock(monitorId);
    expect(stock).toBe(1);
  });

  it("serializes equal-share orders so final stock never goes negative", async () => {
    // mouse has stock = 5; five parallel orders of quantity 1 should all succeed
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app)
          .post("/api/orders")
          .send({ items: [{ productId: mouseId, quantity: 1 }] })
      )
    );

    expect(results.every((r) => r.status === 201)).toBe(true);
    expect(await getStock(mouseId)).toBe(0);
  });

  it("rejects the surplus request when demand exceeds stock by exactly one", async () => {
    // monitor has stock = 3; four parallel orders of quantity 1 -> one must fail
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        request(app)
          .post("/api/orders")
          .send({ items: [{ productId: monitorId, quantity: 1 }] })
      )
    );

    const successes = results.filter((r) => r.status === 201).length;
    const failures = results.filter((r) => r.status === 500).length;

    expect(successes).toBe(3);
    expect(failures).toBe(1);
    expect(await getStock(monitorId)).toBe(0);
  });
});

describe("Concurrency control across multiple order scenarios", () => {
  beforeEach(async () => {
    await resetProducts();
  });

  it("handles mixed multi-item orders without corrupting stock totals", async () => {
    const keyboardBefore = await getStock(keyboardId);
    const mouseBefore = await getStock(mouseId);
    const monitorBefore = await getStock(monitorId);

    const payloads = [
      { items: [{ productId: keyboardId, quantity: 2 }, { productId: mouseId, quantity: 1 }] },
      { items: [{ productId: keyboardId, quantity: 3 }, { productId: monitorId, quantity: 1 }] },
      { items: [{ productId: mouseId, quantity: 2 }, { productId: monitorId, quantity: 1 }] },
      { items: [{ productId: keyboardId, quantity: 1 }] },
    ];

    const results = await Promise.all(
      payloads.map((p) => request(app).post("/api/orders").send(p))
    );

    const succeeded = results
      .map((r, i) => ({ r, p: payloads[i] }))
      .filter(({ r }) => r.status === 201);

    const consumed = succeeded.reduce(
      (acc, { p }) => {
        for (const item of p.items) {
          acc[item.productId] = (acc[item.productId] ?? 0) + item.quantity;
        }
        return acc;
      },
      {} as Record<number, number>
    );

    expect(await getStock(keyboardId)).toBe(keyboardBefore - (consumed[keyboardId] ?? 0));
    expect(await getStock(mouseId)).toBe(mouseBefore - (consumed[mouseId] ?? 0));
    expect(await getStock(monitorId)).toBe(monitorBefore - (consumed[monitorId] ?? 0));
  });

  it("keeps per-product stock non-negative under a burst of concurrent orders", async () => {
    const burst = Array.from({ length: 20 }, (_, i) => {
      const productId = [keyboardId, mouseId, monitorId][i % 3];
      return request(app)
        .post("/api/orders")
        .send({ items: [{ productId, quantity: 1 }] });
    });

    await Promise.all(burst);

    expect(await getStock(keyboardId)).toBeGreaterThanOrEqual(0);
    expect(await getStock(mouseId)).toBeGreaterThanOrEqual(0);
    expect(await getStock(monitorId)).toBeGreaterThanOrEqual(0);
  });

  it("commits successful orders atomically — order row count matches successful responses", async () => {
    const payloads = [
      { items: [{ productId: keyboardId, quantity: 4 }] },
      { items: [{ productId: keyboardId, quantity: 4 }] },
      { items: [{ productId: keyboardId, quantity: 4 }] }, // one of these must fail (stock=10)
      { items: [{ productId: mouseId, quantity: 2 }] },
    ];

    const ordersBefore = await orderCount();

    const results = await Promise.all(
      payloads.map((p) => request(app).post("/api/orders").send(p))
    );

    const successes = results.filter((r) => r.status === 201).length;
    const ordersAfter = await orderCount();

    expect(ordersAfter - ordersBefore).toBe(successes);
  });
});
