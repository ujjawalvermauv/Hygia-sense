const SensorData = require("../models/SensorData");
const Toilet = require("../models/Toilet");
const CleaningTask = require("../models/CleaningTask");
const Cleaner = require("../models/Cleaner");
const Feedback = require("../models/Feedback");

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getRecencyFactor = (timestamp) => {
    if (!timestamp) return 0;

    const elapsedMinutes = (Date.now() - new Date(timestamp).getTime()) / 60000;

    if (elapsedMinutes <= 10) return 1;
    if (elapsedMinutes <= 30) return 0.8;
    if (elapsedMinutes <= 60) return 0.6;
    if (elapsedMinutes <= 120) return 0.4;
    return 0.2;
};

const toIsoOrNull = (value) => (value ? new Date(value).toISOString() : null);

const calculatePriorityFromRisk = (riskScore) => {
    if (riskScore >= 80) return "critical";
    if (riskScore >= 60) return "high";
    if (riskScore >= 40) return "medium";
    return "low";
};

const calculateSlaMinutes = (riskScore) => {
    if (riskScore >= 80) return 15;
    if (riskScore >= 60) return 30;
    if (riskScore >= 40) return 45;
    return 60;
};

const estimateNextCleaningMins = ({
    riskScore,
    avgAqi,
    avgHumidity,
    avgUsagePerHour,
    recentLowRatingRatio,
}) => {
    const humidityPenalty = avgHumidity > 70 ? 15 : avgHumidity < 35 ? 10 : 0;
    const aqiPenalty = avgAqi > 120 ? 20 : avgAqi > 80 ? 10 : 0;
    const usagePenalty = avgUsagePerHour > 25 ? 20 : avgUsagePerHour > 12 ? 10 : 0;
    const ratingPenalty = recentLowRatingRatio > 0.3 ? 20 : recentLowRatingRatio > 0.15 ? 10 : 0;

    const base = 90 - Math.round(riskScore * 0.5);
    return clamp(base - humidityPenalty - aqiPenalty - usagePenalty - ratingPenalty, 10, 180);
};

const buildRecommendation = ({
    riskScore,
    latestSensor,
    pendingTasksCount,
    recentLowRatingRatio,
}) => {
    const recommendations = [];

    if (riskScore >= 80) {
        recommendations.push("Trigger immediate cleaning and notify supervisor");
    } else if (riskScore >= 60) {
        recommendations.push("Assign high-priority cleaning in current shift");
    } else if (riskScore >= 40) {
        recommendations.push("Schedule cleaning in next 45 minutes");
    }

    if (latestSensor?.waterQuality === "poor" || latestSensor?.waterLevel < 30) {
        recommendations.push("Inspect water supply and quality before closure risk");
    }

    if (latestSensor?.aqi > 120) {
        recommendations.push("Increase ventilation and deodorization for this unit");
    }

    if (recentLowRatingRatio > 0.2) {
        recommendations.push("Escalate to quality audit due to repeated low user ratings");
    }

    if (pendingTasksCount > 1) {
        recommendations.push("Rebalance cleaner workload to reduce pending queue");
    }

    if (recommendations.length === 0) {
        recommendations.push("Continue routine monitoring and scheduled cleaning");
    }

    return recommendations;
};

const pickBestCleaner = (cleaners, cleanerStats) => {
    if (!cleaners.length) return null;

    const ranked = cleaners
        .map((cleaner) => {
            const stats = cleanerStats.get(cleaner._id.toString()) || {
                activeCount: 0,
                completedCount: 0,
                avgCompletionMins: 35,
            };

            const availabilityBonus = cleaner.status === "available" ? 25 : 0;
            const activeTaskPenalty = Math.min(stats.activeCount * 12, 36);
            const completionBonus = Math.min(stats.completedCount * 1.5, 20);
            const speedBonus = clamp(30 - stats.avgCompletionMins, 0, 15);

            const score = availabilityBonus + completionBonus + speedBonus - activeTaskPenalty;

            return {
                cleaner,
                score,
                stats,
            };
        })
        .sort((a, b) => b.score - a.score);

    return ranked[0] || null;
};

const getCleanerStats = async () => {
    const tasks = await CleaningTask.find({}, "cleaner status createdAt updatedAt").lean();
    const stats = new Map();

    for (const task of tasks) {
        if (!task.cleaner) continue;

        const cleanerId = task.cleaner.toString();
        if (!stats.has(cleanerId)) {
            stats.set(cleanerId, {
                activeCount: 0,
                completedCount: 0,
                totalCompletionMins: 0,
            });
        }

        const row = stats.get(cleanerId);

        if (task.status !== "completed") {
            row.activeCount += 1;
            continue;
        }

        row.completedCount += 1;
        const durationMins = Math.max(
            1,
            Math.round((new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime()) / 60000)
        );
        row.totalCompletionMins += durationMins;
    }

    for (const [cleanerId, row] of stats.entries()) {
        row.avgCompletionMins = row.completedCount > 0
            ? Math.round(row.totalCompletionMins / row.completedCount)
            : 35;
        stats.set(cleanerId, row);
    }

    return stats;
};

const getToiletInsights = async () => {
    const [toilets, cleaners, cleanerStats] = await Promise.all([
        Toilet.find().lean(),
        Cleaner.find().lean(),
        getCleanerStats(),
    ]);

    const insights = [];

    for (const toilet of toilets) {
        const [latestSensor, recentSensors, recentFeedback, pendingTasks] = await Promise.all([
            SensorData.findOne({ toilet: toilet._id }).sort({ createdAt: -1 }).lean(),
            SensorData.find({ toilet: toilet._id }).sort({ createdAt: -1 }).limit(40).lean(),
            Feedback.find({ toilet: toilet._id }).sort({ createdAt: -1 }).limit(20).lean(),
            CleaningTask.find({
                toilet: toilet._id,
                status: { $in: ["assigned", "in-progress", "pending-approval"] },
            }).lean(),
        ]);

        const avgAqi = recentSensors.length
            ? recentSensors.reduce((sum, row) => sum + (row.aqi || 0), 0) / recentSensors.length
            : latestSensor?.aqi || 0;

        const avgHumidity = recentSensors.length
            ? recentSensors.reduce((sum, row) => sum + (row.humidity || 0), 0) / recentSensors.length
            : latestSensor?.humidity || 50;

        const lowRatingCount = recentFeedback.filter((row) => row.rating <= 2).length;
        const recentLowRatingRatio = recentFeedback.length
            ? lowRatingCount / recentFeedback.length
            : 0;

        const recentSensorWindowHours = recentSensors.length
            ? Math.max(
                1,
                (new Date(recentSensors[0].createdAt).getTime() - new Date(recentSensors[recentSensors.length - 1].createdAt).getTime()) / 3600000
            )
            : 1;

        const avgUsagePerHour = clamp(
            recentSensors.length / recentSensorWindowHours,
            0,
            60
        );

        const waterRisk = latestSensor?.waterQuality === "poor"
            ? 25
            : latestSensor?.waterQuality === "fair"
                ? 10
                : 0;

        const occupancyRisk = latestSensor?.occupancy ? 8 : 0;
        const freshnessFactor = getRecencyFactor(latestSensor?.createdAt);

        const baseRisk =
            clamp((avgAqi / 160) * 35, 0, 35) +
            clamp((avgHumidity > 70 ? (avgHumidity - 70) * 0.6 : 0), 0, 12) +
            clamp((avgUsagePerHour / 30) * 18, 0, 18) +
            clamp(recentLowRatingRatio * 25, 0, 25) +
            waterRisk +
            occupancyRisk +
            (pendingTasks.length > 0 ? 12 : 0);

        const riskScore = clamp(Math.round(baseRisk * (0.7 + freshnessFactor * 0.3)), 0, 100);
        const priority = calculatePriorityFromRisk(riskScore);
        const slaMinutes = calculateSlaMinutes(riskScore);
        const nextCleaningInMins = estimateNextCleaningMins({
            riskScore,
            avgAqi,
            avgHumidity,
            avgUsagePerHour,
            recentLowRatingRatio,
        });

        const recommendedCleaner = pickBestCleaner(cleaners, cleanerStats);

        insights.push({
            toiletId: toilet._id,
            toiletName: toilet.name,
            latestSensorAt: toIsoOrNull(latestSensor?.createdAt),
            riskScore,
            priority,
            slaMinutes,
            nextCleaningAt: new Date(Date.now() + nextCleaningInMins * 60000).toISOString(),
            nextCleaningInMins,
            pendingTasksCount: pendingTasks.length,
            metrics: {
                avgAqi: Math.round(avgAqi),
                avgHumidity: Math.round(avgHumidity),
                avgUsagePerHour: Math.round(avgUsagePerHour),
                recentFeedbackCount: recentFeedback.length,
                recentLowRatingRatio: Number(recentLowRatingRatio.toFixed(2)),
                latestWaterQuality: latestSensor?.waterQuality || "unknown",
                latestWaterLevel: latestSensor?.waterLevel ?? null,
                latestOccupancy: Boolean(latestSensor?.occupancy),
            },
            recommendation: buildRecommendation({
                riskScore,
                latestSensor,
                pendingTasksCount: pendingTasks.length,
                recentLowRatingRatio,
            }),
            recommendedCleaner: recommendedCleaner
                ? {
                    cleanerId: recommendedCleaner.cleaner._id,
                    name: recommendedCleaner.cleaner.name,
                    status: recommendedCleaner.cleaner.status,
                    confidence: clamp(Math.round((recommendedCleaner.score + 40) * 1.2), 35, 99),
                }
                : null,
        });
    }

    return insights.sort((a, b) => b.riskScore - a.riskScore);
};

module.exports = {
    getToiletInsights,
    calculatePriorityFromRisk,
    calculateSlaMinutes,
};
