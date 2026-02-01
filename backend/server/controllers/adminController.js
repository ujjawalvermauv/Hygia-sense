const Toilet = require("../models/Toilet");
const Cleaner = require("../models/Cleaner");
const CleaningTask = require("../models/CleaningTask");

exports.getAdminDashboard = async (req, res) => {
    try {
        const toilets = await Toilet.find();

        const cleaners = await Cleaner.find();

        const tasks = await CleaningTask.find()
            .populate("toilet", "name cleanlinessStatus")
            .populate("cleaner", "name status");

        res.json({
            toilets,
            cleaners,
            tasks,
            summary: {
                totalToilets: toilets.length,
                totalCleaners: cleaners.length,
                activeTasks: tasks.filter(t => t.status !== "completed").length,
            },
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.getCleanerAnalytics = async (req, res) => {
    try {
        const cleaners = await Cleaner.find();

        const analytics = [];

        for (const cleaner of cleaners) {
            const totalTasks = await CleaningTask.countDocuments({
                cleaner: cleaner._id,
            });

            const completedTasks = await CleaningTask.countDocuments({
                cleaner: cleaner._id,
                status: "completed",
            });

            const pendingTasks = totalTasks - completedTasks;

            const completionRate =
                totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

            analytics.push({
                cleanerId: cleaner._id,
                name: cleaner.name,
                status: cleaner.status,
                totalTasks,
                completedTasks,
                pendingTasks,
                completionRate: `${completionRate}%`,
            });
        }

        res.json(analytics);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
