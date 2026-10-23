/**
 * users-service/src/app.js
 *
 * A simple Express service that manages user data.
 * In a real project this would talk to a database.
 * Here we use an in-memory array so you can see request/response flow clearly.
 *
 * Important: This service does NOT validate API keys.
 * API key auth is the gateway's job. Backend services trust that
 * the gateway has already authenticated the request.
 *
 * Endpoints:
 *   GET  /users          → list all users
 *   GET  /users/:id      → get a single user by id
 *   POST /users          → create a new user
 */

const express = require("express");
const app = express();

app.use(express.json());

// --- In-memory "database" ---
let users = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "admin" },
  { id: 2, name: "Bob Smith",    email: "bob@example.com",   role: "user"  },
  { id: 3, name: "Carol White",  email: "carol@example.com", role: "user"  },
];
let nextId = 4;

// Health check — the gateway and Docker health checks hit this
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "users-service" });
});

// GET /users — return all users
app.get("/users", (req, res) => {
  res.json({
    success: true,
    count: users.length,
    data: users,
  });
});

// GET /users/:id — return one user
app.get("/users/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ success: false, message: `User ${id} not found` });
  }

  res.json({ success: true, data: user });
});

// POST /users — create a new user
app.post("/users", (req, res) => {
  const { name, email, role } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: "name and email are required",
    });
  }

  const newUser = { id: nextId++, name, email, role: role || "user" };
  users.push(newUser);

  res.status(201).json({ success: true, data: newUser });
});

module.exports = app;
