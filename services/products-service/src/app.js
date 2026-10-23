/**
 * products-service/src/app.js
 *
 * A simple Express service that manages product data.
 * Uses an in-memory array to keep things clear and dependency-free.
 *
 * Endpoints:
 *   GET  /products        → list all products (supports ?category= filter)
 *   GET  /products/:id    → get a single product by id
 *   POST /products        → create a new product
 */

const express = require("express");
const app = express();

app.use(express.json());

// --- In-memory "database" ---
let products = [
  { id: 1, name: "Wireless Keyboard", category: "electronics", price: 49.99,  stock: 120 },
  { id: 2, name: "Ergonomic Chair",   category: "furniture",   price: 299.00, stock: 30  },
  { id: 3, name: "USB-C Hub",         category: "electronics", price: 29.99,  stock: 250 },
  { id: 4, name: "Standing Desk",     category: "furniture",   price: 449.00, stock: 15  },
];
let nextId = 5;

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "products-service" });
});

// GET /products — return all products, with optional ?category= filter
app.get("/products", (req, res) => {
  const { category } = req.query;
  const result = category
    ? products.filter((p) => p.category === category)
    : products;

  res.json({
    success: true,
    count: result.length,
    data: result,
  });
});

// GET /products/:id — return one product
app.get("/products/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const product = products.find((p) => p.id === id);

  if (!product) {
    return res.status(404).json({ success: false, message: `Product ${id} not found` });
  }

  res.json({ success: true, data: product });
});

// POST /products — create a new product
app.post("/products", (req, res) => {
  const { name, category, price, stock } = req.body;

  if (!name || !category || price === undefined) {
    return res.status(400).json({
      success: false,
      message: "name, category, and price are required",
    });
  }

  const newProduct = {
    id: nextId++,
    name,
    category,
    price: parseFloat(price),
    stock: stock ?? 0,
  };
  products.push(newProduct);

  res.status(201).json({ success: true, data: newProduct });
});

module.exports = app;
