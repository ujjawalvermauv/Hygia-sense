const Toilet = require("../models/Toilet");

// 🎛️ SIMULATE SENSOR DATA
exports.updateSensorData = async (req, res) => {
    try {
        const { toiletId } = req.params;

        // fake sensor values
        const aqi = Math.floor(Math.random() * 300); // 0–300
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
