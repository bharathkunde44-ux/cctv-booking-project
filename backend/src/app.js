require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const bookingRoutes = require("./routes/bookingRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");
const contactRoutes = require("./routes/contactRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "frame-src": ["'self'", "https://www.google.com"],
        "script-src": ["'self'", "https://www.google.com"],
        "img-src": ["'self'", "data:", "https://*.google.com", "https://*.googleusercontent.com", "https://*.gstatic.com"],
      },
    },
  })
);
const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"].filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("CORS policy does not allow access from the specified origin."));
    },
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "cctv-service-api" });
});

app.use("/api/bookings", bookingRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/admin", adminRoutes);

const frontendBuildPath = path.join(__dirname, "..", "..", "cctv-booking-frontend", "build");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(frontendBuildPath));

  app.get("/{*splat}", (req, res) => {
    res.sendFile(path.join(frontendBuildPath, "index.html"));
  });
}

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || "Something went wrong",
  });
});

module.exports = app;
