const express = require("express");
const router = express.Router();

const { updateSensorData } = require("../controllers/sensorController");

// 📡 SENSOR SIMULATION
router.put("/:toiletId", updateSensorData);

module.exports = router;