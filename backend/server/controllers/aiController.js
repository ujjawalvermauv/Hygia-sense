const CleaningTask = require("../models/CleaningTask");
const Toilet = require("../models/Toilet");
const Cleaner = require("../models/Cleaner");
const {
    getToiletInsights,
    calculatePriorityFromRisk,
    calculateSlaMinutes,
} = require("../services/aiInsightsService");

const getAiOverview = async (req, res) => {
    try {
        const insights = await getToiletInsights();

        const summary = {
            monitoredToilets: insights.length,
            critical: insights.filter((row) => row.priority === "critical").length,
            high: insights.filter((row) => row.priority === "high").length,
            medium: insights.filter((row) => row.priority === "medium").length,
            low: insights.filter((row) => row.priority === "low").length,
            averageRiskScore: insights.length
                ? Math.round(insights.reduce((sum, row) => sum + row.riskScore, 0) / insights.length)
                : 0,
            generatedAt: new Date().toISOString(),
        };

        const alerts = insights
            .filter((row) => row.riskScore >= 60)
            .slice(0, 8)
            .map((row) => ({
                toiletId: row.toiletId,
                toiletName: row.toiletName,
                riskScore: row.riskScore,
                priority: row.priority,
                message: row.recommendation[0],
            }));

        res.json({ summary, alerts, insights });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const autoAssignHighRiskTasks = async (req, res) => {
    try {
        const minimumRisk = Number(req.body.minimumRisk || 60);
        const maxAssignments = Number(req.body.maxAssignments || 5);

        const [insights, cleaners] = await Promise.all([
            getToiletInsights(),
            Cleaner.find().lean(),
        ]);

        const createdTasks = [];

        for (const insight of insights) {
            if (createdTasks.length >= maxAssignments) break;
            if (insight.riskScore < minimumRisk) break;

            const existingOpenTask = await CleaningTask.findOne({
                toilet: insight.toiletId,
                status: { $in: ["assigned", "in-progress", "pending-approval"] },
            }).lean();

            if (existingOpenTask) continue;

            let cleanerId = insight.recommendedCleaner?.cleanerId;

            if (!cleanerId) {
                const fallbackCleaner = cleaners.find((row) => row.status === "available") || cleaners[0];
                cleanerId = fallbackCleaner?._id;
            }

            if (!cleanerId) continue;

            const priority = calculatePriorityFromRisk(insight.riskScore);
            const slaMinutes = calculateSlaMinutes(insight.riskScore);
            const deadline = new Date(Date.now() + slaMinutes * 60000);

            const task = await CleaningTask.create({
                toilet: insight.toiletId,
                cleaner: cleanerId,
                status: "assigned",
                priority,
                slaDeadline: deadline,
                aiRecommendation: {
                    riskScore: insight.riskScore,
                    recommendation: insight.recommendation[0],
                    confidence: insight.recommendedCleaner?.confidence || 70,
                    generatedAt: new Date(),
                },
            });

            await Cleaner.findByIdAndUpdate(cleanerId, { status: "busy" });
            await Toilet.findByIdAndUpdate(insight.toiletId, {
                needsCleaning: true,
                cleanlinessStatus: insight.riskScore >= 75 ? "red" : "orange",
            });

            createdTasks.push(task);
        }

        res.status(201).json({
            message: "AI auto-assignment completed",
            requestedMinimumRisk: minimumRisk,
            assignmentsCreated: createdTasks.length,
            tasks: createdTasks,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAiOverview,
    autoAssignHighRiskTasks,
};
