const CleaningTask = require("../models/CleaningTask");
const Toilet = require("../models/Toilet");
const Cleaner = require("../models/Cleaner");

// Manually assign cleaning task
exports.assignTask = async (req, res) => {
    try {
        const { toiletId, cleanerId } = req.body;

        const toilet = await Toilet.findById(toiletId);
        const cleaner = await Cleaner.findById(cleanerId);

        if (!toilet || !cleaner) {
            return res.status(404).json({
                message: "Toilet or Cleaner not found"
            });
        }

        const task = await CleaningTask.create({
            toilet: toiletId,
            cleaner: cleanerId
        });

        res.status(201).json({
            message: "Cleaning task assigned",
            task
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
