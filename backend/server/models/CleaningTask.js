const mongoose = require("mongoose");

const cleaningTaskSchema = new mongoose.Schema(
    {
        toilet: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Toilet",
            required: true,
        },
        cleaner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Cleaner",
            required: true,
        },
        status: {
            type: String,
            enum: ["assigned", "completed"],
            default: "assigned",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("CleaningTask", cleaningTaskSchema);
