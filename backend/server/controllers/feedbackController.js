const Feedback = require("../models/Feedback");
const Toilet = require("../models/Toilet");

// ADD FEEDBACK (QR scan)
exports.addFeedback = async (req, res) => {
    try {
        const { toiletId } = req.params;
        const { rating, comment } = req.body;

        if (!rating) {
            return res.status(400).json({ message: "Rating required" });
        }

        const feedback = await Feedback.create({
            toilet: toiletId,
            rating,
            comment,
        });

        // 🚨 If rating low, mark toilet red
        if (rating <= 2) {
            await Toilet.findByIdAndUpdate(toiletId, {
                cleanlinessStatus: "red",
            });
        }

        res.status(201).json(feedback);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET FEEDBACK BY TOILET
exports.getToiletFeedback = async (req, res) => {
    try {
        const { toiletId } = req.params;

        const feedbacks = await Feedback.find({ toilet: toiletId });

        const avgRating =
            feedbacks.reduce((sum, f) => sum + f.rating, 0) /
            (feedbacks.length || 1);

        res.json({
            totalFeedbacks: feedbacks.length,
            averageRating: avgRating.toFixed(1),
            feedbacks,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
