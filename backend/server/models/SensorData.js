const mongoose = require("mongoose");

const sensorDataSchema = new mongoose.Schema(
    {
        toilet: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Toilet",
            required: true,
        },
        aqi: {
            type: Number,
            default: 0,
            min: 0,
            max: 500,
        },
        humidity: {
            type: Number,
            default: 50,
            min: 0,
            max: 100,
        },
        temperature: {
            type: Number,
            default: 22,
            min: -50,
            max: 50,
        },
        waterLevel: {
            type: Number,
            default: 100,
            min: 0,
            max: 100,
        },
        waterQuality: {
            type: String,
            enum: ["good", "fair", "poor"],
            default: "good",
        },
        occupancy: {
            type: Boolean,
            default: false,
        },
        pir_motion: {
            type: Boolean,
            default: false,
        },
        cleanliness: {
            type: String,
            enum: ["green", "orange", "red"],
            default: "green",
        },
    },
    { timestamps: true }
);

// Keep only latest 1440 readings per toilet (24 hours @ 1 reading per min)
sensorDataSchema.index({ toilet: 1, createdAt: -1 });

module.exports = mongoose.model("SensorData", sensorDataSchema);
