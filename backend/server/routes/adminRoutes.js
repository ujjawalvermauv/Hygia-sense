const express = require("express");
const router = express.Router();

const {
    getAdminDashboard,
    getCleanerAnalytics,
    getAdminAlerts,
    getAlertSettings,
    updateAlertSettings,
} = require("../controllers/adminController");

router.get("/dashboard", getAdminDashboard);
router.get("/cleaner-analytics", getCleanerAnalytics);
router.get("/alerts", getAdminAlerts);
router.get("/alert-settings", getAlertSettings);
router.put("/alert-settings", updateAlertSettings);

module.exports = router;
