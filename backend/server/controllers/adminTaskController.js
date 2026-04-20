const CleaningTask = require("../models/CleaningTask");
const Toilet = require("../models/Toilet");
const Cleaner = require("../models/Cleaner");
const path = require("path");
const mongoose = require("mongoose");

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

// Upload photos for a task
exports.uploadPhotos = async (req, res) => {
    try {
        const { taskId } = req.params;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No files uploaded" });
        }

        const task = await CleaningTask.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const existingPhotoCount = task.photos?.length || 0;
        const incomingPhotoCount = req.files.length;
        const totalPhotoCount = existingPhotoCount + incomingPhotoCount;

        if (totalPhotoCount < 2) {
            return res.status(400).json({
                message: "Please upload both before and after photos before submitting the task.",
                requiredPhotos: 2,
                uploadedPhotos: totalPhotoCount,
            });
        }

        // Add photos to task
        const photos = req.files.map((file) => ({
            filename: file.filename,
            url: `/uploads/${file.filename}`,
            uploadedAt: new Date(),
        }));

        task.photos.push(...photos);
        task.status = "pending-approval";
        task.approvalStatus = "pending";
        await task.save();

        res.status(200).json({
            message: "Photos uploaded successfully",
            task: await task.populate("toilet cleaner"),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all tasks for admin approval
exports.getTasksForApproval = async (req, res) => {
    try {
        const tasks = await CleaningTask.find({ status: "pending-approval" })
            .populate("toilet")
            .populate("cleaner")
            .sort({ updatedAt: -1 });

        const validTasks = tasks.filter((task) => task.toilet && task.cleaner);

        res.status(200).json(validTasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all tasks with all statuses
exports.getAllTasks = async (req, res) => {
    try {
        const tasks = await CleaningTask.find()
            .populate("toilet")
            .populate("cleaner")
            .sort({ createdAt: -1 });

        const validTasks = tasks.filter((task) => task.toilet && task.cleaner);

        res.status(200).json(validTasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get single task
exports.getTaskById = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await CleaningTask.findById(taskId)
            .populate("toilet")
            .populate("cleaner")
            .populate("approvedBy");

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.status(200).json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Approve task
exports.approveTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { approvalNotes, adminId } = req.body;

        const task = await CleaningTask.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (!task.photos || task.photos.length < 2) {
            return res.status(400).json({
                message: "Photo upload is mandatory. Please ensure both before and after photos are uploaded before approval.",
                requiredPhotos: 2,
                uploadedPhotos: task.photos?.length || 0,
            });
        }

        task.approvalStatus = "approved";
        task.status = "completed";
        task.approvalNotes = approvalNotes || "";
        if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
            task.approvedBy = adminId;
        }
        await task.save();

        res.status(200).json({
            message: "Task approved successfully",
            task: await task.populate("toilet cleaner approvedBy"),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Reject task
exports.rejectTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { rejectionReason, adminId } = req.body;

        const task = await CleaningTask.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        task.approvalStatus = "rejected";
        task.status = "assigned";
        task.rejectionReason = rejectionReason || "Rejected by admin";
        if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
            task.approvedBy = adminId;
        }
        await task.save();

        res.status(200).json({
            message: "Task rejected",
            task: await task.populate("toilet cleaner approvedBy"),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete photos from task
exports.deletePhoto = async (req, res) => {
    try {
        const { taskId, photoId } = req.params;

        const task = await CleaningTask.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        task.photos = task.photos.filter((photo) => photo._id.toString() !== photoId);
        await task.save();

        res.status(200).json({
            message: "Photo deleted",
            task,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

