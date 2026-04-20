require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const Toilet = require("./models/Toilet");
const SensorData = require("./models/SensorData");
const { sendAdminSystemFailureAlert } = require("./services/notificationService");

const PORT = process.env.PORT || 5000;

// 🔐 Sensor Data Datasets (Custom Dataset)
const sensorDatasets = [
    { aqi: 45, humidity: 65, temperature: 22, waterLevel: 95, waterQuality: "good", occupancy: false, cleanliness: "green" },
    { aqi: 78, humidity: 72, temperature: 23, waterLevel: 88, waterQuality: "good", occupancy: true, cleanliness: "green" },
    { aqi: 120, humidity: 80, temperature: 24, waterLevel: 75, waterQuality: "fair", occupancy: true, cleanliness: "orange" },
    { aqi: 180, humidity: 85, temperature: 25, waterLevel: 60, waterQuality: "poor", occupancy: false, cleanliness: "red" },
    { aqi: 95, humidity: 70, temperature: 22, waterLevel: 92, waterQuality: "good", occupancy: false, cleanliness: "green" },
];

// 📡 Auto-update sensor data every 5 seconds (with timeout to prevent stacking)
let sensorDataIndex = 0;
const startSensorDataUpdates = async () => {
    const updateSensorData = async () => {
        try {
            const toilets = await Toilet.find();

            for (const toilet of toilets) {
                // Cycle through dataset for each toilet
                const data = sensorDatasets[sensorDataIndex % sensorDatasets.length];

                // Create sensor reading
                await SensorData.create({
                    toilet: toilet._id,
                    aqi: data.aqi + Math.random() * 20,
                    humidity: data.humidity + Math.random() * 5,
                    temperature: data.temperature + (Math.random() - 0.5) * 2,
                    waterLevel: Math.max(0, Math.min(100, data.waterLevel + (Math.random() - 0.5) * 10)),
                    waterQuality: data.waterQuality,
                    occupancy: Math.random() > 0.6,
                    pir_motion: Math.random() > 0.7,
                    cleanliness: data.cleanliness,
                });

                // Update toilet model with latest reading
                await Toilet.findByIdAndUpdate(toilet._id, {
                    aqi: data.aqi,
                    waterCondition: data.waterQuality,
                    occupancy: data.occupancy,
                    cleanlinessStatus: data.cleanliness,
                });
            }

            sensorDataIndex++;
            console.log(`✅ Sensor data updated - Cycle ${sensorDataIndex}`);
        } catch (error) {
            console.error("❌ Error updating sensor data:", error.message);
            try {
                await sendAdminSystemFailureAlert({
                    source: "server.startSensorDataUpdates",
                    errorMessage: error.message,
                });
            } catch (alertError) {
                console.error("❌ Failed to send sensor failure alert:", alertError.message);
            }
        } finally {
            // Reschedule the next update (prevents interval stacking and connection pool exhaustion)
            setTimeout(updateSensorData, 5000);
        }
    };

    // Start the first update
    updateSensorData();
};

mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("✅ MongoDB connected");

        const server = app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);

            // Start sensor data updates only after the HTTP server is ready.
            startSensorDataUpdates();
        });

        server.on("error", async (error) => {
            if (error.code === "EADDRINUSE") {
                console.error(`⚠️ Port ${PORT} is already in use. Another Hygia Sense backend instance is already running.`);
                process.exit(0);
                return;
            }

            console.error("❌ Server failed to start:", error);
            try {
                await sendAdminSystemFailureAlert({
                    source: "server.listen",
                    errorMessage: error?.message || "Server failed to start",
                });
            } catch (alertError) {
                console.error("❌ Failed to send server startup alert:", alertError.message);
            }
            process.exit(1);
        });
    })
    .catch(async (err) => {
        console.error("❌ MongoDB connection failed:", err);
        try {
            await sendAdminSystemFailureAlert({
                source: "server.mongoConnect",
                errorMessage: err?.message || "MongoDB connection failed",
            });
        } catch (alertError) {
            console.error("❌ Failed to send MongoDB failure alert:", alertError.message);
        }
    });

module.exports = { startSensorDataUpdates };

