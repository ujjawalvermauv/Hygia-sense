const mongoose = require("mongoose");

const cleanerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        unique: true,
        sparse: true,
    },
    mobileNumber: {
        type: String,
        trim: true,
    },
    password: {
        type: String,
    },
    approvalStatus: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "approved",
    },
    accountStatus: {
        type: String,
        enum: ["active", "inactive"],
        default: "active",
    },
    shift: {
        type: String,
        enum: ["morning", "afternoon", "night"],
        default: "morning",
    },
    shiftLabel: {
        type: String,
        default: "Morning (6 AM - 2 PM)",
    },
    approvalHistory: [
        {
            action: {
                type: String,
                enum: ["requested", "approved", "rejected", "activated", "deactivated", "shift-updated"],
            },
            actor: {
                type: String,
                required: true,
            },
            note: {
                type: String,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    lastShiftStartedAt: {
        type: Date,
    },
    lastShiftEndedAt: {
        type: Date,
    },
    lastInactiveActionDate: {
        type: String,
    },
    status: {
        type: String,
        enum: ["available", "busy", "off-shift"],
        default: "available"
    },
    assignedTasks: {
        type: Number, default: 0

    },
    completedTasks: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model("Cleaner", cleanerSchema);
