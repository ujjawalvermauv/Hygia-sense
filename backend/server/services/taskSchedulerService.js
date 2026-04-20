const CleaningTask = require("../models/CleaningTask");
const Cleaner = require("../models/Cleaner");
const Toilet = require("../models/Toilet");
const SensorData = require("../models/SensorData");
const Feedback = require("../models/Feedback");

const TEN_MINUTES_IN_MS = 10 * 60 * 1000;
const SIX_HOURS_IN_MS = 6 * 60 * 60 * 1000;
const DEFAULT_ASSIGNMENT_SLA_MINUTES = 15;
const TARGET_OPEN_TASKS_PER_CLEANER = Number(process.env.TARGET_OPEN_TASKS_PER_CLEANER || 2);
const MAX_OPEN_TASKS_PER_CLEANER = Number(process.env.MAX_OPEN_TASKS_PER_CLEANER || 2);
const LOGIN_TASK_TARGET = Number(process.env.LOGIN_TASK_TARGET || 1);
const ALLOW_DEMO_TOILETS = String(process.env.ALLOW_DEMO_TOILETS || "false").toLowerCase() === "true";

let schedulerRunning = false;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const isEligibleCleaner = (cleaner) => {
    const approved = !cleaner.approvalStatus || cleaner.approvalStatus === "approved";
    const active = !cleaner.accountStatus || cleaner.accountStatus === "active";
    const onShift = cleaner.status !== "off-shift";
    const cooldownOk = !cleaner.lastShiftEndedAt || (Date.now() - new Date(cleaner.lastShiftEndedAt).getTime()) >= SIX_HOURS_IN_MS;

    return approved && active && onShift && cooldownOk;
};

const getPendingTaskQuery = () => ({
    status: { $in: ["assigned", "in-progress", "pending-approval"] },
});

const findNextAvailableToilet = async () => {
    const toilets = await Toilet.find().sort({ createdAt: 1 }).lean();

    for (const toilet of toilets) {
        const openTask = await CleaningTask.findOne({
            toilet: toilet._id,
            ...getPendingTaskQuery(),
        }).lean();

        if (!openTask) {
            return toilet;
        }
    }

    return null;
};

const getOpenTaskCountsByCleaner = async () => {
    const rows = await CleaningTask.aggregate([
        { $match: getPendingTaskQuery() },
        { $group: { _id: "$cleaner", count: { $sum: 1 } } },
    ]);

    const map = new Map();
    for (const row of rows) {
        map.set(String(row._id), row.count || 0);
    }

    return map;
};

const getOpenToiletIds = async () => {
    const rows = await CleaningTask.aggregate([
        { $match: getPendingTaskQuery() },
        { $group: { _id: "$toilet" } },
    ]);

    return new Set(rows.map((row) => String(row._id)));
};

const getPendingIssueScore = async (toiletId) => {
    const rows = await CleaningTask.aggregate([
        {
            $match: {
                toilet: toiletId,
                ...getPendingTaskQuery(),
            },
        },
        {
            $project: {
                issueReports: 1,
            },
        },
    ]);

    if (!rows.length) return 0;

    let score = 0;
    for (const row of rows) {
        const reports = row.issueReports || [];
        for (const report of reports) {
            if (report?.severity === "high") score += 12;
            else if (report?.severity === "medium") score += 6;
            else score += 3;
        }
    }

    return clamp(score, 0, 30);
};

const calculateToiletRiskScore = async (toilet) => {
    const [latestSensor, feedbackRows, pendingIssueScore] = await Promise.all([
        SensorData.findOne({ toilet: toilet._id }).sort({ createdAt: -1 }).lean(),
        Feedback.find({ toilet: toilet._id }).sort({ createdAt: -1 }).limit(20).lean(),
        getPendingIssueScore(toilet._id),
    ]);

    const aqi = Number(latestSensor?.aqi || toilet.aqi || 0);
    const occupancy = Boolean(latestSensor?.occupancy ?? toilet.occupancy);

    const aqiScore = clamp((aqi / 180) * 45, 0, 45);
    const occupancyScore = occupancy ? 12 : 0;

    const lowRatings = feedbackRows.filter((row) => Number(row.rating || 0) <= 2).length;
    const lowRatingRatio = feedbackRows.length ? lowRatings / feedbackRows.length : 0;
    const feedbackScore = clamp(lowRatingRatio * 25, 0, 25);

    const riskScore = clamp(Math.round(aqiScore + occupancyScore + feedbackScore + pendingIssueScore), 0, 100);

    return {
        toilet,
        riskScore,
        inputs: {
            aqi,
            occupancy,
            feedbackCount: feedbackRows.length,
            lowRatingRatio: Number(lowRatingRatio.toFixed(2)),
            pendingIssueScore,
        },
    };
};

const getPrioritizedToilets = async () => {
    const toilets = await Toilet.find().sort({ createdAt: 1 }).lean();
    const openToiletIds = await getOpenToiletIds();

    const candidates = toilets.filter((toilet) => !openToiletIds.has(String(toilet._id)));
    if (candidates.length === 0) return [];

    const scored = await Promise.all(candidates.map((toilet) => calculateToiletRiskScore(toilet)));
    return scored.sort((left, right) => right.riskScore - left.riskScore);
};

const buildCleanerFairnessRows = async (cleaners) => {
    const openCounts = await getOpenTaskCountsByCleaner();

    return cleaners
        .filter((cleaner) => isEligibleCleaner(cleaner))
        .map((cleaner) => {
            const cleanerId = String(cleaner._id);
            const openCount = openCounts.get(cleanerId) || 0;
            const assignedTasks = Number(cleaner.assignedTasks || 0);
            const completedTasks = Number(cleaner.completedTasks || 0);
            const availabilityPenalty = cleaner.status === "available" ? 0 : 20;

            // Lower score means more fair/available for next assignment.
            const fairnessScore =
                openCount * 100 +
                assignedTasks * 3 +
                availabilityPenalty -
                Math.min(completedTasks * 0.2, 15);

            return {
                cleaner,
                cleanerId,
                openCount,
                fairnessScore,
            };
        });
};

const chooseLeastLoadedCleaner = (rows) => {
    const eligible = rows
        .filter((row) => row.openCount < MAX_OPEN_TASKS_PER_CLEANER)
        .sort((left, right) => {
            if (left.fairnessScore !== right.fairnessScore) {
                return left.fairnessScore - right.fairnessScore;
            }

            return left.cleaner.name.localeCompare(right.cleaner.name);
        });

    return eligible[0] || null;
};

const createDemoToilet = async (cleaner, slotNumber) => {
    const cleanerTag = String(cleaner._id).slice(-6).toUpperCase();

    return Toilet.create({
        name: `Demo Washroom ${cleaner.name} ${slotNumber}`,
        toiletNumber: `DEMO-${cleanerTag}-${slotNumber}`,
        floor: "Demo Floor",
        userCount: 0,
        needsCleaning: true,
        aqi: 120,
        waterCondition: "bad",
        occupancy: false,
        cleanlinessStatus: "orange",
    });
};

const countOpenTasksForCleaner = async (cleanerId) => {
    return CleaningTask.countDocuments({
        cleaner: cleanerId,
        status: { $in: ["assigned", "in-progress", "pending-approval"] },
    });
};

const assignTaskToCleaner = async (cleaner, toilet) => {
    const task = await CleaningTask.create({
        toilet: toilet._id,
        cleaner: cleaner._id,
        status: "assigned",
        priority: "critical",
        slaDeadline: new Date(Date.now() + DEFAULT_ASSIGNMENT_SLA_MINUTES * 60000),
        reviewHistory: [
            {
                type: "assigned",
                message: "Task auto-assigned to cleaner.",
                actor: "scheduler",
            },
        ],
    });

    await Cleaner.findByIdAndUpdate(cleaner._id, {
        status: "busy",
        $inc: { assignedTasks: 1 },
    });

    await Toilet.findByIdAndUpdate(toilet._id, {
        needsCleaning: true,
        cleanlinessStatus: "orange",
    });

    return task;
};

const assignTasksForCleaner = async (cleanerId, targetOpenTasks = LOGIN_TASK_TARGET) => {
    const cleaner = await Cleaner.findById(cleanerId).lean();
    if (!cleaner || !isEligibleCleaner(cleaner)) {
        return { created: 0, cleaner: null, tasks: [] };
    }

    let openTaskCount = await countOpenTasksForCleaner(cleaner._id);
    let nextSlot = openTaskCount + 1;
    const createdTasks = [];
    const prioritizedToilets = await getPrioritizedToilets();
    let toiletCursor = 0;

    while (openTaskCount < targetOpenTasks) {
        let toilet = prioritizedToilets[toiletCursor]?.toilet;
        toiletCursor += 1;

        if (!toilet) {
            toilet = await findNextAvailableToilet();
        }

        if (!toilet && ALLOW_DEMO_TOILETS) {
            toilet = await createDemoToilet(cleaner, nextSlot);
        }

        if (!toilet) {
            break;
        }

        const existingOpenTask = await CleaningTask.findOne({
            cleaner: cleaner._id,
            toilet: toilet._id,
            ...getPendingTaskQuery(),
        }).lean();

        if (existingOpenTask) {
            break;
        }

        const task = await assignTaskToCleaner(cleaner, toilet);
        createdTasks.push(task);
        openTaskCount += 1;
        nextSlot += 1;
    }

    return {
        created: createdTasks.length,
        cleaner,
        tasks: createdTasks,
        targetOpenTasks,
    };
};

const runAutoTaskAssignment = async () => {
    if (schedulerRunning) {
        return { created: 0, skipped: true };
    }

    schedulerRunning = true;

    try {
        const cleaners = await Cleaner.find({
            approvalStatus: { $in: ["approved", null] },
            accountStatus: { $in: ["active", null] },
        })
            .sort({ assignedTasks: 1, completedTasks: -1, createdAt: 1 })
            .lean();

        if (cleaners.length === 0) {
            return { created: 0, skipped: false };
        }

        const prioritizedToilets = await getPrioritizedToilets();
        const cleanerRows = await buildCleanerFairnessRows(cleaners);

        if (prioritizedToilets.length === 0 || cleanerRows.length === 0) {
            return { created: 0, skipped: false, tasks: [] };
        }

        const createdTasks = [];
        let demoToiletSlot = 1;

        for (const item of prioritizedToilets) {
            const selected = chooseLeastLoadedCleaner(cleanerRows);
            if (!selected) {
                break;
            }

            const task = await assignTaskToCleaner(selected.cleaner, item.toilet);
            createdTasks.push(task);

            selected.openCount += 1;
            selected.fairnessScore += 100;
        }

        if (ALLOW_DEMO_TOILETS) {
            for (const row of cleanerRows) {
                while (row.openCount < TARGET_OPEN_TASKS_PER_CLEANER && row.openCount < MAX_OPEN_TASKS_PER_CLEANER) {
                    const demoToilet = await createDemoToilet(row.cleaner, demoToiletSlot);
                    demoToiletSlot += 1;

                    const task = await assignTaskToCleaner(row.cleaner, demoToilet);
                    createdTasks.push(task);
                    row.openCount += 1;
                    row.fairnessScore += 100;
                }
            }
        }

        return { created: createdTasks.length, skipped: false, tasks: createdTasks };
    } finally {
        schedulerRunning = false;
    }
};

const startTaskScheduler = () => {
    const runOnce = async () => {
        try {
            const result = await runAutoTaskAssignment();
            if (result?.created > 0) {
                console.log(`✅ Auto task scheduler created ${result.created} task(s)`);
            }
        } catch (error) {
            console.error("❌ Auto task scheduler failed:", error.message);
        }
    };

    void runOnce();

    return setInterval(() => {
        void runOnce();
    }, TEN_MINUTES_IN_MS);
};

module.exports = {
    startTaskScheduler,
    runAutoTaskAssignment,
    assignTasksForCleaner,
};