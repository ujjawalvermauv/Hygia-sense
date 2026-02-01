const express = require("express");
const router = express.Router();

const {
    getAdminDashboard,
    getCleanerAnalytics,
} = require("../controllers/adminController");

router.get("/dashboard", getAdminDashboard);
router.get("/cleaner-analytics", getCleanerAnalytics);

module.exports = router;
