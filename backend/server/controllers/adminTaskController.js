const CleaningTask = require("../models/CleaningTask");
const Toilet = require("../models/Toilet");
const Cleaner = require("../models/Cleaner");
const path = require("path");
const mongoose = require("mongoose");
const {
    sendAdminCleaningNotification,
    sendAdminWhatsAppAlert,
    sendAdminSystemFailureAlert,
    sendCleanerWhatsAppAlert,
} = require("../services/notificationService");
const DEFAULT_ASSIGNMENT_SLA_MINUTES = 15;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getShiftTimeWindow = (cleaner) => {
    const shiftKey = String(cleaner?.shift || "").trim().toLowerCase();

    if (shiftKey === "morning") return "Morning (6:00 AM - 2:00 PM)";
    if (shiftKey === "afternoon") return "Afternoon (2:00 PM - 10:00 PM)";
    if (shiftKey === "night") return "Night (10:00 PM - 6:00 AM)";

    const label = String(cleaner?.shiftLabel || "").trim();
    return label || "N/A";
};

const getTargetMinutes = (task) => {
    if (task.slaDeadline) {
        const targetBySla = Math.round(
            (new Date(task.slaDeadline).getTime() - new Date(task.createdAt).getTime()) / 60000
        );
        if (targetBySla > 0) {
            return targetBySla;
        }
    }

    if (task.priority === "critical") return 15;
    if (task.priority === "high") return 30;
    if (task.priority === "medium") return 45;
    return 60;
};

const calculateEfficiency = (task) => {
    const actualMinutes = Math.max(
        1,
        Math.round((Date.now() - new Date(task.createdAt).getTime()) / 60000)
    );

    const targetMinutes = getTargetMinutes(task);
    const speedScore = clamp(Math.round((targetMinutes / actualMinutes) * 100), 40, 100);
    const evidenceScore = task.photos?.length >= 2 ? 100 : 70;

    return Math.round(speedScore * 0.8 + evidenceScore * 0.2);
};

// Manually assign cleaning task
exports.assignTask = async (req, res) => {
    try {
        const { toiletId, cleanerId } = req.body;

        const existingOpenTask = await CleaningTask.findOne({
            toilet: toiletId,
            status: { $in: ["assigned", "in-progress", "pending-approval"] },
        }).populate("cleaner");

        if (existingOpenTask) {
            return res.status(409).json({
                message: `Open task already exists for this toilet and is assigned to ${existingOpenTask.cleaner?.name || "a cleaner"}.`,
            });
        }

        const toilet = await Toilet.findById(toiletId);

        let cleaner = cleanerId ? await Cleaner.findById(cleanerId) : null;

        if (!cleaner) {
            cleaner = await Cleaner.findOne({
                approvalStatus: { $in: ["approved", null] },
                accountStatus: { $in: ["active", null] },
                status: { $in: ["available", null] },
            }).sort({ assignedTasks: 1, completedTasks: -1, createdAt: 1 });
        }

        if (!toilet || !cleaner) {
            return res.status(404).json({
                message: "Toilet or Cleaner not found"
            });
        }

        if (cleaner.approvalStatus && cleaner.approvalStatus !== "approved") {
            return res.status(400).json({ message: "Selected cleaner is not approved yet." });
        }

        if (cleaner.accountStatus && cleaner.accountStatus !== "active") {
            return res.status(400).json({ message: "Selected cleaner account is inactive." });
        }

        if (cleaner.status === "off-shift") {
            return res.status(400).json({ message: "Selected cleaner is off-shift and cannot receive tasks." });
        }

        const task = await CleaningTask.create({
            toilet: toiletId,
            cleaner: cleaner._id,
            status: "assigned",
            priority: "critical",
            slaDeadline: new Date(Date.now() + DEFAULT_ASSIGNMENT_SLA_MINUTES * 60000),
        });

        await Cleaner.findByIdAndUpdate(cleaner._id, {
            status: "busy",
            $inc: { assignedTasks: 1 },
        });

        const taskRef = String(task._id).slice(-6).toUpperCase();
        const toiletNumber = toilet.toiletNumber || toilet.name || "N/A";
        const floor = toilet.floor || "N/A";
        const shiftTime = getShiftTimeWindow(cleaner);
        const assignmentMessage = [
            `Task Assignment: ${taskRef}`,
            `Washroom Number: ${toiletNumber}`,
            `Floor: ${floor}`,
            `Shift Timing: ${shiftTime}`,
            "Action: Please start cleaning now and upload before/after photos.",
        ].join("\n");

        try {
            await sendCleanerWhatsAppAlert({
                cleanerName: cleaner.name,
                cleanerPhone: cleaner.mobileNumber,
                message: assignmentMessage,
                source: "adminTaskController.assignTask",
            });
        } catch (alertError) {
            console.error("Failed to send cleaner task assignment alert:", alertError.message);
        }

        try {
            await sendAdminWhatsAppAlert({
                message: `Admin Alert: ${assignmentMessage} | Cleaner: ${cleaner.name}`,
                eventType: "cleaning-update",
                source: "adminTaskController.assignTask",
            });
        } catch (adminAlertError) {
            console.error("Failed to send admin task assignment alert:", adminAlertError.message);
        }

        res.status(201).json({
            message: `Cleaning task assigned to ${cleaner.name}`,
            task
        });
    } catch (error) {
        await sendAdminSystemFailureAlert({
            source: "adminTaskController.assignTask",
            errorMessage: error.message,
        });
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

        const efficiency = calculateEfficiency(task);
        const autoApproved = efficiency > 85;

        task.completionEfficiency = efficiency;
        task.completedAt = new Date();
        task.autoApproved = autoApproved;

        if (autoApproved) {
            task.status = "completed";
            task.approvalStatus = "approved";
            task.approvalNotes = `Auto-approved by system. Efficiency ${efficiency}%`;
        } else {
            task.status = "pending-approval";
            task.approvalStatus = "pending";
        }

        await task.save();

        const populatedTask = await task.populate("toilet cleaner");

        const notificationMeta = await sendAdminCleaningNotification({
            toiletName: populatedTask.toilet?.name || "Unknown washroom",
            cleanerName: populatedTask.cleaner?.name || "Cleaner",
            efficiency,
            autoApproved,
        });

        task.notificationMeta = {
            delivered: notificationMeta.delivered,
            channel: notificationMeta.channel,
            recipients: notificationMeta.recipients,
        };
        await task.save();

        if (autoApproved) {
            await Cleaner.findByIdAndUpdate(task.cleaner, {
                status: "available",
                $inc: { completedTasks: 1, assignedTasks: -1 },
            });
        }

        res.status(200).json({
            message: autoApproved
                ? `Photos uploaded. Task auto-approved at ${efficiency}% efficiency.`
                : `Photos uploaded. Task submitted for admin review at ${efficiency}% efficiency.`,
            autoApproved,
            efficiency,
            task: await task.populate("toilet cleaner"),
        });
    } catch (error) {
        await sendAdminSystemFailureAlert({
            source: "adminTaskController.uploadPhotos",
            errorMessage: error.message,
        });
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
        task.completedAt = task.completedAt || new Date();
        task.approvalNotes = approvalNotes || "";
        if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
            task.approvedBy = adminId;
        }
        task.reviewHistory = [
            ...(task.reviewHistory || []),
            {
                type: "approved",
                message: approvalNotes || "Admin approved the task.",
                efficiency: task.completionEfficiency,
                actor: adminId || "admin",
            },
        ];
        await task.save();

        await Cleaner.findByIdAndUpdate(task.cleaner, {
            status: "available",
            $inc: { completedTasks: 1, assignedTasks: -1 },
        });

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
        task.reviewHistory = [
            ...(task.reviewHistory || []),
            {
                type: "rejected",
                message: rejectionReason || "Admin rejected the task and requested re-cleaning.",
                efficiency: task.completionEfficiency,
                actor: adminId || "admin",
            },
        ];
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

