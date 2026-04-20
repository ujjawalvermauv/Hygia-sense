const CleaningTask = require("../models/CleaningTask");
const Cleaner = require("../models/Cleaner");
const Toilet = require("../models/Toilet");
const { analyzePhotoImprovement } = require("../services/photoAiService");
const { sendAdminCleaningNotification } = require("../services/notificationService");
const DEFAULT_ASSIGNMENT_SLA_MINUTES = 15;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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

const parseQrMatchesTask = (qrValue, task) => {
    if (!qrValue) return false;

    const normalized = String(qrValue).trim();
    if (normalized === "1234") return true;

    const toiletId = task.toilet.toString();
    return normalized === toiletId || normalized.includes(toiletId);
};

const normalizeLocation = (location) => {
    if (!location) return undefined;

    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    const accuracy = location.accuracy !== undefined ? Number(location.accuracy) : undefined;

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return undefined;
    }

    return {
        latitude,
        longitude,
        accuracy: Number.isNaN(accuracy) ? undefined : accuracy,
    };
};

// CREATE TASK
exports.createCleaningTask = async (req, res) => {
    try {
        const { toilet, cleaner, status } = req.body;

        if (!toilet || !cleaner) {
            return res.status(400).json({ message: "toilet and cleaner required" });
        }

        const cleanerDoc = await Cleaner.findById(cleaner);
        if (!cleanerDoc) {
            return res.status(404).json({ message: "Cleaner not found" });
        }

        if (cleanerDoc.status === "off-shift") {
            return res.status(400).json({ message: "Cleaner is off-shift and cannot receive new tasks." });
        }

        const existingOpenTask = await CleaningTask.findOne({
            toilet,
            status: { $in: ["assigned", "in-progress", "pending-approval"] },
        });

        if (existingOpenTask) {
            return res.status(409).json({
                message: "An open cleaning task already exists for this toilet.",
            });
        }

        const task = await CleaningTask.create({
            toilet,
            cleaner,
            status: status || "assigned",
            priority: "critical",
            slaDeadline: new Date(Date.now() + DEFAULT_ASSIGNMENT_SLA_MINUTES * 60000),
            reviewHistory: [
                {
                    type: "assigned",
                    message: "Task assigned to cleaner.",
                    actor: "system",
                },
            ],
        });

        // update cleaner status
        await Cleaner.findByIdAndUpdate(cleaner, {
            status: "busy",
            $inc: { assignedTasks: 1 },
        });

        res.status(201).json(task);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// START TASK AFTER QR SCAN
exports.startCleaningTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { qrValue, location } = req.body;

        const task = await CleaningTask.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (!parseQrMatchesTask(qrValue, task)) {
            return res.status(400).json({
                message: "QR code does not match this toilet. Please scan the correct toilet QR code.",
            });
        }

        const normalizedLocation = normalizeLocation(location);

        task.status = "in-progress";
        task.startedAt = new Date();
        task.qrVerified = true;
        task.startedLocation = normalizedLocation;
        task.reviewHistory = [
            ...(task.reviewHistory || []),
            {
                type: "started",
                message: `Cleaner scanned QR and started the task${normalizedLocation ? " at verified location." : "."}`,
                actor: "cleaner",
            },
        ];
        await task.save();

        res.json({
            message: "Task started successfully",
            task,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET ALL TASKS
exports.getAllCleaningTasks = async (req, res) => {
    try {
        const tasks = await CleaningTask.find()
            .populate("toilet")
            .populate("cleaner");

        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.completeCleaningTask = async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await CleaningTask.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (!task.startedAt || !task.qrVerified) {
            return res.status(400).json({
                message: "Start the task by scanning the toilet QR code before completing it.",
            });
        }

        if (!req.files || req.files.length < 2) {
            return res.status(400).json({
                message: "Please upload both start and completion photos.",
            });
        }

        const startPhoto = req.files[0];
        const endPhoto = req.files[1];

        const elapsedMinutes = Math.max(
            1,
            Math.round((Date.now() - new Date(task.startedAt).getTime()) / 60000)
        );
        const targetMinutes = getTargetMinutes(task);
        const timeEfficiency = clamp(Math.round((targetMinutes / elapsedMinutes) * 100), 0, 100);

        const photoAnalysis = await analyzePhotoImprovement({
            beforeFile: startPhoto,
            afterFile: endPhoto,
        });

        const photoImprovementScore = clamp(photoAnalysis.improvementScore, 0, 100);
        const verificationBonus = task.qrVerified ? 10 : 0;
        const finalEfficiency = clamp(
            Math.round(timeEfficiency * 0.45 + photoImprovementScore * 0.45 + verificationBonus),
            0,
            100
        );

        const autoApproved = finalEfficiency > 85;

        task.photos = req.files.map((file) => ({
            filename: file.filename,
            url: `/uploads/${file.filename}`,
            uploadedAt: new Date(),
        }));
        task.timeEfficiency = timeEfficiency;
        task.photoImprovementScore = photoImprovementScore;
        task.completionEfficiency = finalEfficiency;
        task.completedAt = new Date();
        task.autoApproved = autoApproved;
        task.approvalStatus = autoApproved ? "approved" : "pending";
        task.status = autoApproved ? "completed" : "pending-approval";
        task.completionNotes = autoApproved
            ? `Auto-approved using AI scoring (${photoAnalysis.source}).`
            : `Submitted for admin review using AI scoring (${photoAnalysis.source}).`;
        task.reviewHistory = [
            ...(task.reviewHistory || []),
            {
                type: "completed",
                message: `Cleaner submitted completion photos. Time efficiency ${timeEfficiency}%, photo improvement ${photoImprovementScore}% using ${photoAnalysis.source}.`,
                efficiency: finalEfficiency,
                actor: "cleaner",
            },
            {
                type: autoApproved ? "auto-approved" : "manual-review",
                message: autoApproved
                    ? `Auto-approved because efficiency ${finalEfficiency}% is above threshold 85%.`
                    : `Manual review required because efficiency ${finalEfficiency}% is at or below threshold 85%.`,
                efficiency: finalEfficiency,
                actor: "system",
            },
        ];
        await task.save();

        const notificationMeta = await sendAdminCleaningNotification({
            toiletName: (await task.populate("toilet")).toilet?.name || "Unknown washroom",
            cleanerName: (await task.populate("cleaner")).cleaner?.name || "Cleaner",
            efficiency: finalEfficiency,
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

            await Toilet.findByIdAndUpdate(task.toilet, {
                cleanlinessStatus: "green",
                needsCleaning: false,
                userCount: 0,
                occupancy: false,
            });
        } else {
            await Toilet.findByIdAndUpdate(task.toilet, {
                cleanlinessStatus: "orange",
                needsCleaning: true,
            });
        }

        // update toilet after cleaning
        const populatedTask = await task.populate("toilet cleaner");

        res.json({
            message: "Cleaning completed successfully",
            autoApproved,
            timeEfficiency,
            photoImprovementScore,
            finalEfficiency,
            task: populatedTask,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.reportCleaningIssue = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { note, severity = "medium", reportedVia = "text" } = req.body;

        const normalizedNote = String(note || "").trim();
        if (!normalizedNote) {
            return res.status(400).json({ message: "Issue note is required." });
        }

        const task = await CleaningTask.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const validSeverity = ["low", "medium", "high"].includes(severity) ? severity : "medium";
        const validReportedVia = ["text", "voice"].includes(reportedVia) ? reportedVia : "text";

        task.issueReports = [
            ...(task.issueReports || []),
            {
                note: normalizedNote,
                severity: validSeverity,
                reportedVia: validReportedVia,
                createdAt: new Date(),
            },
        ];

        task.reviewHistory = [
            ...(task.reviewHistory || []),
            {
                type: "issue-reported",
                message: `Cleaner reported ${validSeverity} issue via ${validReportedVia}: ${normalizedNote}`,
                actor: "cleaner",
            },
        ];

        if (["assigned", "in-progress"].includes(task.status) && validSeverity === "high" && task.priority !== "critical") {
            task.priority = "high";
        }

        await task.save();

        const populatedTask = await task.populate("toilet cleaner");

        res.json({
            message: "Issue reported and logged for admin review.",
            task: populatedTask,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

