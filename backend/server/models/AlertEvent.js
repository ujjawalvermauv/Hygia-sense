const mongoose = require("mongoose");

const alertEventSchema = new mongoose.Schema(
    {
        eventType: {
            type: String,
            enum: ["cleaning-update", "signup-request", "system-failure", "cleaner-alert"],
            required: true,
        },
        source: {
            type: String,
            default: null,
        },
        channel: {
            type: String,
            default: "log",
        },
        message: {
            type: String,
            required: true,
        },
        recipients: {
            type: [String],
            default: [],
        },
        delivered: {
            type: Boolean,
            default: false,
        },
        suppressed: {
            type: Boolean,
            default: false,
        },
        reason: {
            type: String,
            default: null,
        },
        results: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        fallbackLinks: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("AlertEvent", alertEventSchema);
