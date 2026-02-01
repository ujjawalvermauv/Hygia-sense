const express = require("express");
const app = express();

app.use(express.json());

// ROUTES
app.use("/api/toilets", require("./routes/toiletRoutes"));
app.use("/api/cleaners", require("./routes/cleanerRoutes"));
app.use("/api/tasks", require("./routes/cleaningTaskRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/feedback", require("./routes/feedbackRoutes"));
app.use("/api/sensor", require("./routes/sensorRoutes"));



module.exports = app;
