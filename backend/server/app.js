const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:8081",
    ],
    credentials: true,
}));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ROUTES
app.use("/api/toilets", require("./routes/toiletRoutes"));
app.use("/api/cleaners", require("./routes/cleanerRoutes"));
app.use("/api/tasks", require("./routes/cleaningTaskRoutes"));
app.use("/api/admin-tasks", require("./routes/adminTaskRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/feedback", require("./routes/feedbackRoutes"));
app.use("/api/sensor", require("./routes/sensorRoutes"));

// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

module.exports = app;

