const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const multer = require("multer");
const {
    assignTask,
    uploadPhotos,
    getTasksForApproval,
    getAllTasks,
    getTaskById,
    approveTask,
    rejectTask,
    deletePhoto,
} = require("../controllers/adminTaskController");

// Assign task
router.post("/assign", assignTask);

// Get all tasks for admin approval
router.get("/pending-approval", getTasksForApproval);

// Get all tasks
router.get("/", getAllTasks);

// Get single task
router.get("/:taskId", getTaskById);

// Upload photos for a task
router.post("/:taskId/photos", (req, res, next) => {
    upload.array("photos", 5)(req, res, (error) => {
        if (!error) {
            return next();
        }

        if (error instanceof multer.MulterError) {
            if (error.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    message: "Each image must be less than 5MB.",
                });
            }

            return res.status(400).json({
                message: error.message,
            });
        }

        return res.status(400).json({
            message: error.message || "Photo upload failed.",
        });
    });
}, uploadPhotos);

// Approve task
router.put("/:taskId/approve", approveTask);

// Reject task
router.put("/:taskId/reject", rejectTask);

// Delete photo
router.delete("/:taskId/photos/:photoId", deletePhoto);

module.exports = router;
