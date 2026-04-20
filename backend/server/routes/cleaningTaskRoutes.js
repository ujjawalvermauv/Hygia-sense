const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");

const {
    createCleaningTask,
    getAllCleaningTasks,
    startCleaningTask,
    completeCleaningTask,
    reportCleaningIssue,
} = require("../controllers/cleaningTaskController");

// ✅ create task
router.post("/", createCleaningTask);

// ✅ get all tasks
router.get("/", getAllCleaningTasks);
router.post("/:taskId/start", startCleaningTask);
router.put("/:taskId/complete", upload.array("photos", 2), completeCleaningTask);
router.post("/:taskId/issue", reportCleaningIssue);

module.exports = router;
