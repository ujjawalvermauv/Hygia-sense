const express = require("express");
const router = express.Router();

const {
    getAllSensorData,
    getSensorDataByToilet,
    getLatestSensorData,
    updateSensorData,
} = require("../controllers/sensorController");

// Get all latest sensor data
router.get("/", getAllSensorData);

// Get sensor data for a specific toilet
router.get("/:toiletId/history", getSensorDataByToilet);

// Get latest sensor data for a toilet
router.get("/:toiletId/latest", getLatestSensorData);

// Manual sensor data update (for testing)
router.put("/:toiletId", updateSensorData);

module.exports = router;