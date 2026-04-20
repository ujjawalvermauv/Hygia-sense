const express = require("express");
const router = express.Router();
const {
    getAiOverview,
    autoAssignHighRiskTasks,
} = require("../controllers/aiController");

router.get("/overview", getAiOverview);
router.post("/auto-assign", autoAssignHighRiskTasks);

module.exports = router;
