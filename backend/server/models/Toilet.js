const mongoose = require("mongoose");

const toiletSchema = new mongoose.Schema(
    {
        name: String,
        userCount: {
            type: Number,
            default: 0,
        },
        needsCleaning: {
            type: Boolean,
            default: false,
        }, aqi: { type: Number, default: 0 },
        waterCondition: { type: String, enum: ["good", "bad"], default: "good" },
        occupancy: { type: Boolean, default: false },
        cleanlinessStatus: { type: String, enum: ["green", "orange", "red"], default: "green" }


    },
    { timestamps: true }
);

module.exports = mongoose.model("Toilet", toiletSchema);
