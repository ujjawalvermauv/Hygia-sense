const CleaningTask = require("../models/CleaningTask");
const Cleaner = require("../models/Cleaner");
const Toilet = require("../models/Toilet");

// CREATE TASK
exports.createCleaningTask = async (req, res) => {
    try {
        const { toilet, cleaner, status } = req.body;

        if (!toilet || !cleaner) {
            return res.status(400).json({ message: "toilet and cleaner required" });
        }

        const task = await CleaningTask.create({
            toilet,
            cleaner,
            status: status || "assigned",
        });

        // update cleaner status
        await Cleaner.findByIdAndUpdate(cleaner, {
            status: "busy",
        });

        res.status(201).json(task);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET ALL TASKS
exports.getAllCleaningTasks = async (req, res) => {
    try {
        const tasks = await CleaningTask.find()
            .populate("toilet")
            .populate("cleaner");

        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.completeCleaningTask = async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await CleaningTask.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // mark task completed
        task.status = "completed";
        await task.save();

        // make cleaner available
        await Cleaner.findByIdAndUpdate(task.cleaner, {
            status: "available",
        });

        // update toilet after cleaning
        await Toilet.findByIdAndUpdate(task.toilet, {
            cleanlinessStatus: "green",
            userCount: 0,
            occupancy: false,
        });

        res.json({
            message: "Cleaning completed successfully",
            task,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

