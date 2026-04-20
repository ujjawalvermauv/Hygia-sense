const CleaningTask = require("../models/CleaningTask");
const Toilet = require("../models/Toilet");
const Cleaner = require("../models/Cleaner");
const {
    getToiletInsights,
    calculatePriorityFromRisk,
} = require("../services/aiInsightsService");
const { sendAdminSystemFailureAlert } = require("../services/notificationService");

const DEFAULT_ASSIGNMENT_SLA_MINUTES = 15;

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
        await sendAdminSystemFailureAlert({
            source: "aiController.getAiOverview",
            errorMessage: error.message,
        });
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

        const eligibleCleaners = cleaners
            .filter((row) => {
                const approved = !row.approvalStatus || row.approvalStatus === "approved";
                const active = !row.accountStatus || row.accountStatus === "active";
                const onShift = row.status !== "off-shift";
                return approved && active && onShift;
            })
            .map((row) => ({ ...row, assignedTasks: row.assignedTasks || 0 }));

        const createdTasks = [];

        for (const insight of insights) {
            if (createdTasks.length >= maxAssignments) break;
            if (insight.riskScore < minimumRisk) break;

            const existingOpenTask = await CleaningTask.findOne({
                toilet: insight.toiletId,
                status: { $in: ["assigned", "in-progress", "pending-approval"] },
            }).lean();

            if (existingOpenTask) continue;

            const sortedByWorkload = eligibleCleaners
                .slice()
                .sort((left, right) => {
                    const assignedDiff = (left.assignedTasks || 0) - (right.assignedTasks || 0);
                    if (assignedDiff !== 0) return assignedDiff;
                    return (right.completedTasks || 0) - (left.completedTasks || 0);
                });

            const leastLoadedCleaner = sortedByWorkload[0];
            const recommendedCleaner = sortedByWorkload.find(
                (row) => String(row._id) === String(insight.recommendedCleaner?.cleanerId)
            );

            let cleanerId = leastLoadedCleaner?._id;

            if (recommendedCleaner && leastLoadedCleaner) {
                const recommendedLoad = recommendedCleaner.assignedTasks || 0;
                const leastLoad = leastLoadedCleaner.assignedTasks || 0;

                // Keep AI recommendation when it's close to fair load; otherwise prioritize balance.
                if (recommendedLoad <= leastLoad + 1) {
                    cleanerId = recommendedCleaner._id;
                }
            }

            if (!cleanerId) continue;

            const priority = calculatePriorityFromRisk(insight.riskScore);
            const deadline = new Date(Date.now() + DEFAULT_ASSIGNMENT_SLA_MINUTES * 60000);

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

            await Cleaner.findByIdAndUpdate(cleanerId, {
                status: "busy",
                $inc: { assignedTasks: 1 },
            });

            const selectedCleaner = eligibleCleaners.find((row) => String(row._id) === String(cleanerId));
            if (selectedCleaner) {
                selectedCleaner.assignedTasks = (selectedCleaner.assignedTasks || 0) + 1;
            }
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
        await sendAdminSystemFailureAlert({
            source: "aiController.autoAssignHighRiskTasks",
            errorMessage: error.message,
        });
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAiOverview,
    autoAssignHighRiskTasks,
};
