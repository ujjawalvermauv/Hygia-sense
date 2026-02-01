const express = require("express");
const router = express.Router();

const {
    addFeedback,
    getToiletFeedback,
} = require("../controllers/feedbackController");

// 📱 QR FEEDBACK
router.post("/:toiletId", addFeedback);

// 📊 ADMIN VIEW
router.get("/:toiletId", getToiletFeedback);

module.exports = router;
