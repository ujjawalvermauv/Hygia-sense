const express = require("express");
const router = express.Router();

const {
    createCleaningTask,
    getAllCleaningTasks,
    completeCleaningTask,
} = require("../controllers/cleaningTaskController");

// ✅ create task
router.post("/", createCleaningTask);

// ✅ get all tasks
router.get("/", getAllCleaningTasks);
router.put("/:taskId/complete", completeCleaningTask);

module.exports = router;
