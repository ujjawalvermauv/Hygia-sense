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
        startedAt: {
            type: Date,
        },
        startedLocation: {
            latitude: Number,
            longitude: Number,
            accuracy: Number,
        },
        qrVerified: {
            type: Boolean,
            default: false,
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
        completionEfficiency: {
            type: Number,
            min: 0,
            max: 100,
        },
        timeEfficiency: {
            type: Number,
            min: 0,
            max: 100,
        },
        photoImprovementScore: {
            type: Number,
            min: 0,
            max: 100,
        },
        completedAt: {
            type: Date,
        },
        autoApproved: {
            type: Boolean,
            default: false,
        },
        notificationMeta: {
            delivered: Boolean,
            channel: String,
            recipients: [String],
        },
        reviewHistory: [
            {
                type: {
                    type: String,
                    enum: ["assigned", "started", "completed", "auto-approved", "manual-review", "approved", "rejected", "issue-reported", "reassigned"],
                },
                message: String,
                efficiency: Number,
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
                actor: String,
            },
        ],
        issueReports: [
            {
                note: {
                    type: String,
                    required: true,
                    trim: true,
                },
                severity: {
                    type: String,
                    enum: ["low", "medium", "high"],
                    default: "medium",
                },
                reportedVia: {
                    type: String,
                    enum: ["text", "voice"],
                    default: "text",
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
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

