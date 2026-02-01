const mongoose = require("mongoose");

const cleanerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["available", "busy"],
        default: "available"
    },
    assignedTasks: {
        type: Number, default: 0

    },
    completedTasks: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model("Cleaner", cleanerSchema);
