
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/events");
const startEventReminder = require("./utils/eventReminder");

const app = express();

console.log(" Server starting...");
console.log(" Environment:", process.env.NODE_ENV || "development");

// ─────────────────────────────
// CORS SETUP
// ─────────────────────────────
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

console.log(" CORS enabled (all origins allowed)");

// ─────────────────────────────
// MIDDLEWARE
// ─────────────────────────────
app.use(express.json());
console.log(" JSON middleware enabled");

// ─────────────────────────────
// ROUTES
// ─────────────────────────────
app.use("/api/auth", authRoutes);
console.log(" Auth routes loaded at /api/auth");

app.use("/api/events", eventRoutes);
console.log(" Event routes loaded at /api/events");

// ─────────────────────────────
// DB CONNECTION
// ─────────────────────────────
console.log(" Connecting to MongoDB...");
connectDB();

// ─────────────────────────────
// CRON JOB (Event Reminder)
// ─────────────────────────────
console.log(" Starting event reminder service...");
startEventReminder();

// ─────────────────────────────
// SERVER START
// ─────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(" SERVER IS LIVE");
  console.log(` Running on port: ${PORT}`);
  console.log(` Local: http://localhost:${PORT}`);
});