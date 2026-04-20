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
            enum: ["assigned", "in-progress", "completed", "pending-approval"],
            default: "assigned",
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high", "critical"],
            default: "medium",
        },
        slaDeadline: {
            type: Date,
        },
        photos: [
            {
                filename: String,
                url: String,
                uploadedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        approvalStatus: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
        },
        approvalNotes: String,
        rejectionReason: String,
        completionNotes: String,
        aiRecommendation: {
            riskScore: {
                type: Number,
                min: 0,
                max: 100,
            },
            recommendation: String,
            confidence: {
                type: Number,
                min: 0,
                max: 100,
            },
            generatedAt: Date,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("CleaningTask", cleaningTaskSchema);

