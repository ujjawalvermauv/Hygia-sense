const Toilet = require("../models/Toilet");
const CleaningTask = require("../models/CleaningTask");
const Cleaner = require("../models/Cleaner");
// GET /api/toilets
exports.getAllToilets = async (req, res) => {
    try {
        const toilets = await Toilet.find();
        res.json(toilets);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/toilets
exports.createToilet = async (req, res) => {
    try {
        const toilet = new Toilet(req.body);
        const saved = await toilet.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// PUT /api/toilets/:id
exports.updateToilet = async (req, res) => {
    try {
        const updated = await Toilet.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
exports.enterToilet = async (req, res) => {
    try {
        const { toiletId } = req.params;

        const toilet = await Toilet.findById(toiletId);
        if (!toilet) {
            return res.status(404).json({ message: "Toilet not found" });
        }

        // increase user count
        toilet.userCount += 1;

        // threshold check
        if (toilet.userCount >= toilet.cleaningThreshold) {
            toilet.cleanlinessStatus = "red";

            // find available cleaner
            const cleaner = await Cleaner.findOne({ status: "available" });

            if (cleaner) {
                // create cleaning task
                await CleaningTask.create({
                    toilet: toilet._id,
                    cleaner: cleaner._id,
                    status: "pending",
                });

                // mark cleaner busy
                cleaner.status = "busy";
                await cleaner.save();
            }
        }

        await toilet.save();

        res.json(toilet);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};