const Toilet = require("../models/Toilet");
const SensorData = require("../models/SensorData");

// Get latest sensor data for all toilets
exports.getAllSensorData = async (req, res) => {
    try {
        const toilets = await Toilet.find();
        const sensorData = [];

        for (const toilet of toilets) {
            const latestReading = await SensorData.findOne({ toilet: toilet._id })
                .sort({ createdAt: -1 });

            sensorData.push({
                toilet: toilet._id,
                name: toilet.name,
                ...latestReading?.toObject() || {},
            });
        }

        res.json(sensorData);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get sensor data for a specific toilet
exports.getSensorDataByToilet = async (req, res) => {
    try {
        const { toiletId } = req.params;
        const limit = req.query.limit || 100;

        const sensorData = await SensorData.find({ toilet: toiletId })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json(sensorData);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get latest sensor reading for a toilet
exports.getLatestSensorData = async (req, res) => {
    try {
        const { toiletId } = req.params;

        const sensorData = await SensorData.findOne({ toilet: toiletId })
            .sort({ createdAt: -1 });

        if (!sensorData) {
            return res.status(404).json({ message: "No sensor data found" });
        }

        res.json(sensorData);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 🎛️ SIMULATE SENSOR DATA (optional for manual testing)
exports.updateSensorData = async (req, res) => {
    try {
        const { toiletId } = req.params;

        const aqi = Math.floor(Math.random() * 300);
        const waterCondition = Math.random() > 0.2 ? "good" : "bad";
        const occupancy = Math.random() > 0.5;

        let cleanlinessStatus = "green";

        if (aqi > 200 || waterCondition === "bad") {
            cleanlinessStatus = "red";
        } else if (aqi > 100) {
            cleanlinessStatus = "orange";
        }

        const toilet = await Toilet.findByIdAndUpdate(
            toiletId,
            {
                aqi,
                waterCondition,
                occupancy,
                cleanlinessStatus,
            },
            { new: true }
        );

        res.json({
            message: "Sensor data updated",
            toilet,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

