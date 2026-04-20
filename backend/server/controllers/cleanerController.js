const Cleaner = require("../models/Cleaner");
const CleaningTask = require("../models/CleaningTask");
const {
    sendAdminCleanerSignupAlert,
    sendAdminSystemFailureAlert,
    sendCleanerWhatsAppAlert,
} = require("../services/notificationService");

const shiftLabelMap = {
    morning: "Morning (6 AM - 2 PM)",
    afternoon: "Afternoon (2 PM - 10 PM)",
    night: "Night (10 PM - 6 AM)",
};

const normalizePhone = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    if (raw.startsWith("+")) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    return `+${digits}`;
};

const normalizeShift = (value) => {
    if (!value) return "morning";
    const normalized = String(value).trim().toLowerCase();
    if (["morning", "afternoon", "night"].includes(normalized)) {
        return normalized;
    }
    return "morning";
};

const normalizeActor = (...values) => {
    for (const value of values) {
        const actor = String(value || "").trim();
        if (actor) return actor;
    }
    return "system-admin";
};

const getDateKey = (value = new Date()) => {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, "0");
    const day = `${value.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const SIX_HOURS_IN_MS = 6 * 60 * 60 * 1000;

const reportFailure = async (source, error) => {
    try {
        await sendAdminSystemFailureAlert({
            source,
            errorMessage: error?.message || "Unknown error",
        });
    } catch (alertError) {
        console.error(`Failed to send admin failure alert for ${source}:`, alertError.message);
    }
};

const toPublicCleaner = (cleaner) => {
    if (!cleaner) return cleaner;
    const row = cleaner.toObject ? cleaner.toObject() : cleaner;
    delete row.password;
    return row;
};

// GET all cleaners
async function getAllCleaners(req, res) {
    try {
        const cleaners = await Cleaner.find().sort({ createdAt: -1 }).select("-password");
        res.json(cleaners);
    } catch (error) {
        await reportFailure("cleanerController.getAllCleaners", error);
        res.status(500).json({ message: error.message });
    }
}

// CREATE cleaner
async function createCleaner(req, res) {
    try {
        const shift = normalizeShift(req.body.shift);

        const cleaner = new Cleaner({
            ...req.body,
            shift,
            shiftLabel: shiftLabelMap[shift],
            approvalStatus: req.body.approvalStatus || "approved",
            accountStatus: req.body.accountStatus || "active",
        });
        const savedCleaner = await cleaner.save();
        res.status(201).json(toPublicCleaner(savedCleaner));
    } catch (error) {
        await reportFailure("cleanerController.createCleaner", error);
        res.status(400).json({ message: error.message });
    }
}

async function requestCleanerSignup(req, res) {
    try {
        const name = String(req.body.name || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "").trim();
        const mobileNumber = normalizePhone(req.body.mobileNumber);

        if (!name || !email || !password || !mobileNumber) {
            return res.status(400).json({ message: "name, email, password, and mobileNumber are required." });
        }

        const existingCleaner = await Cleaner.findOne({ email });

        if (existingCleaner?.approvalStatus === "approved") {
            return res.status(409).json({ message: "Cleaner account already approved. Please sign in." });
        }

        if (existingCleaner?.approvalStatus === "pending") {
            return res.status(409).json({ message: "Signup request already pending admin approval." });
        }

        if (existingCleaner?.approvalStatus === "rejected") {
            existingCleaner.name = name;
            existingCleaner.password = password;
            existingCleaner.mobileNumber = mobileNumber;
            existingCleaner.approvalStatus = "pending";
            existingCleaner.accountStatus = "inactive";
            await existingCleaner.save();

            await sendAdminCleanerSignupAlert({
                cleanerName: name,
                cleanerEmail: email,
                requestType: "resubmitted",
            });

            return res.status(200).json({
                message: "Signup request resubmitted. Awaiting admin approval.",
            });
        }

        const cleaner = await Cleaner.create({
            name,
            email,
            password,
            mobileNumber,
            shift: "morning",
            shiftLabel: shiftLabelMap.morning,
            approvalStatus: "pending",
            accountStatus: "inactive",
            status: "available",
            assignedTasks: 0,
            completedTasks: 0,
            approvalHistory: [
                {
                    action: "requested",
                    actor: email,
                    note: "Cleaner signup request submitted.",
                },
            ],
        });

        await sendAdminCleanerSignupAlert({
            cleanerName: cleaner.name,
            cleanerEmail: cleaner.email,
        });

        res.status(201).json({
            message: "Signup request submitted. Awaiting admin approval.",
            cleaner: {
                _id: cleaner._id,
                name: cleaner.name,
                email: cleaner.email,
                mobileNumber: cleaner.mobileNumber,
                approvalStatus: cleaner.approvalStatus,
            },
        });
    } catch (error) {
        await reportFailure("cleanerController.requestCleanerSignup", error);
        res.status(500).json({ message: error.message });
    }
}

async function cleanerLogin(req, res) {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "").trim();

        if (!email || !password) {
            return res.status(400).json({ message: "email and password are required." });
        }

        const cleaner = await Cleaner.findOne({ email });

        if (!cleaner) {
            return res.status(404).json({ message: "Cleaner account not found. Please sign up first." });
        }

        const approvalStatus = cleaner.approvalStatus || "approved";
        const accountStatus = cleaner.accountStatus || "active";

        if (approvalStatus !== "approved" || accountStatus !== "active") {
            return res.status(403).json({ message: "Your cleaner account is pending admin approval." });
        }

        if (cleaner.password !== password) {
            return res.status(401).json({ message: "Invalid cleaner email or password." });
        }

        res.json({
            message: "Cleaner login successful.",
            cleaner: {
                _id: cleaner._id,
                name: cleaner.name,
                email: cleaner.email,
                approvalStatus: cleaner.approvalStatus,
            },
        });
    } catch (error) {
        await reportFailure("cleanerController.cleanerLogin", error);
        res.status(500).json({ message: error.message });
    }
}

async function getPendingCleanerRequests(req, res) {
    try {
        const cleaners = await Cleaner.find({ approvalStatus: "pending" })
            .sort({ createdAt: -1 })
            .select("-password");
        res.json(cleaners);
    } catch (error) {
        await reportFailure("cleanerController.getPendingCleanerRequests", error);
        res.status(500).json({ message: error.message });
    }
}

async function approveCleanerRequest(req, res) {
    try {
        const { cleanerId } = req.params;
        const approvedBy = normalizeActor(req.body.approvedBy, req.body.actor, req.body.email);
        const note = String(req.body.note || "").trim();

        const cleaner = await Cleaner.findById(cleanerId);
        if (!cleaner) {
            return res.status(404).json({ message: "Cleaner request not found." });
        }

        cleaner.approvalStatus = "approved";
        cleaner.accountStatus = "active";
        cleaner.approvalHistory = [
            ...(cleaner.approvalHistory || []),
            {
                action: "approved",
                actor: approvedBy,
                note: note || "Cleaner signup approved.",
            },
        ];
        await cleaner.save();

        try {
            await sendCleanerWhatsAppAlert({
                cleanerName: cleaner.name,
                cleanerPhone: cleaner.mobileNumber,
                message: "your signup request was approved. You can now login to Hygia Sense.",
                source: "cleanerController.approveCleanerRequest",
            });
        } catch (alertError) {
            console.error("Failed to send cleaner approval alert:", alertError.message);
        }

        res.json({
            message: "Cleaner request approved.",
            cleaner: toPublicCleaner(cleaner),
        });
    } catch (error) {
        await reportFailure("cleanerController.approveCleanerRequest", error);
        res.status(500).json({ message: error.message });
    }
}

async function rejectCleanerRequest(req, res) {
    try {
        const { cleanerId } = req.params;
        const rejectedBy = normalizeActor(req.body.rejectedBy, req.body.actor, req.body.email);
        const reason = String(req.body.reason || "").trim();

        const cleaner = await Cleaner.findById(cleanerId);
        if (!cleaner) {
            return res.status(404).json({ message: "Cleaner request not found." });
        }

        cleaner.approvalStatus = "rejected";
        cleaner.accountStatus = "inactive";
        cleaner.approvalHistory = [
            ...(cleaner.approvalHistory || []),
            {
                action: "rejected",
                actor: rejectedBy,
                note: reason || "Cleaner signup rejected.",
            },
        ];

        await cleaner.save();

        try {
            await sendCleanerWhatsAppAlert({
                cleanerName: cleaner.name,
                cleanerPhone: cleaner.mobileNumber,
                message: "your signup request was rejected. Please contact admin or re-submit with updated details.",
                source: "cleanerController.rejectCleanerRequest",
            });
        } catch (alertError) {
            console.error("Failed to send cleaner rejection alert:", alertError.message);
        }

        res.json({
            message: "Cleaner request rejected.",
            cleaner: toPublicCleaner(cleaner),
        });
    } catch (error) {
        await reportFailure("cleanerController.rejectCleanerRequest", error);
        res.status(500).json({ message: error.message });
    }
}

async function updateCleanerRoster(req, res) {
    try {
        const { cleanerId } = req.params;
        const actor = normalizeActor(req.body.actor, req.body.approvedBy, req.body.rejectedBy, req.body.email);
        const note = String(req.body.note || "").trim();
        const requestedStatus = req.body.accountStatus;
        const requestedShift = req.body.shift;

        const cleaner = await Cleaner.findById(cleanerId);
        if (!cleaner) {
            return res.status(404).json({ message: "Cleaner not found." });
        }

        const historyUpdates = [];

        if (["active", "inactive"].includes(requestedStatus) && cleaner.accountStatus !== requestedStatus) {
            cleaner.accountStatus = requestedStatus;
            historyUpdates.push({
                action: requestedStatus === "active" ? "activated" : "deactivated",
                actor,
                note: note || `Cleaner marked as ${requestedStatus}.`,
            });

            if (requestedStatus === "inactive") {
                cleaner.status = "available";
            }
        }

        if (requestedShift) {
            const shift = normalizeShift(requestedShift);
            if (cleaner.shift !== shift) {
                cleaner.shift = shift;
                cleaner.shiftLabel = shiftLabelMap[shift];
                historyUpdates.push({
                    action: "shift-updated",
                    actor,
                    note: note || `Shift updated to ${shiftLabelMap[shift]}.`,
                });
            }
        }

        if (historyUpdates.length === 0) {
            return res.status(400).json({ message: "No valid roster changes provided." });
        }

        cleaner.approvalHistory = [...(cleaner.approvalHistory || []), ...historyUpdates];
        await cleaner.save();

        res.json({
            message: "Cleaner roster updated.",
            cleaner: toPublicCleaner(cleaner),
        });
    } catch (error) {
        await reportFailure("cleanerController.updateCleanerRoster", error);
        res.status(500).json({ message: error.message });
    }
}

async function updateSelfShiftStatus(req, res) {
    try {
        const { cleanerId } = req.params;
        const onShift = req.body.onShift;
        const note = String(req.body.note || "").trim();

        if (typeof onShift !== "boolean") {
            return res.status(400).json({ message: "onShift boolean is required." });
        }

        const cleaner = await Cleaner.findById(cleanerId);
        if (!cleaner) {
            return res.status(404).json({ message: "Cleaner not found." });
        }

        if (cleaner.approvalStatus && cleaner.approvalStatus !== "approved") {
            return res.status(403).json({ message: "Only approved cleaners can manage shift status." });
        }

        if (cleaner.accountStatus && cleaner.accountStatus !== "active") {
            return res.status(403).json({ message: "Inactive cleaner account cannot start shift." });
        }

        const actor = normalizeActor(req.body.actor, req.body.email, cleaner.email, cleaner.name);

        if (onShift) {
            if (cleaner.lastShiftEndedAt) {
                const cooldownEndsAt = new Date(new Date(cleaner.lastShiftEndedAt).getTime() + SIX_HOURS_IN_MS);
                if (Date.now() < cooldownEndsAt.getTime()) {
                    return res.status(400).json({
                        message: `You can start next shift after ${cooldownEndsAt.toLocaleString()}. Minimum 6-hour rest gap is required.`,
                    });
                }
            }

            if (cleaner.status !== "available") {
                cleaner.status = "available";
                cleaner.lastShiftStartedAt = new Date();
                cleaner.approvalHistory = [
                    ...(cleaner.approvalHistory || []),
                    {
                        action: "activated",
                        actor,
                        note: note || "Cleaner started shift and is available for assignment.",
                    },
                ];
                await cleaner.save();
            }

            return res.json({
                message: "Shift started. You are now available for assignment.",
                cleaner: toPublicCleaner(cleaner),
            });
        }

        const todayKey = getDateKey(new Date());

        if (cleaner.lastInactiveActionDate === todayKey) {
            return res.status(400).json({
                message: "You can complete shift only once per day. Please start your next shift tomorrow or after the required gap.",
            });
        }

        const activeTasks = await CleaningTask.find({
            cleaner: cleaner._id,
            status: { $in: ["assigned", "in-progress"] },
        }).populate("cleaner");

        const reassignedTaskIds = [];

        for (const task of activeTasks) {
            const replacementCleaner = await Cleaner.findOne({
                _id: { $ne: cleaner._id },
                approvalStatus: { $in: ["approved", null] },
                accountStatus: { $in: ["active", null] },
                status: { $in: ["available", null] },
            }).sort({ assignedTasks: 1, completedTasks: -1, createdAt: 1 });

            if (!replacementCleaner) {
                return res.status(400).json({
                    message: "No available cleaner found to take over pending tasks. Shift cannot be completed right now.",
                });
            }

            const previousCleanerName = task.cleaner?.name || cleaner.name || "Previous cleaner";
            const nextCleanerName = replacementCleaner.name || "New cleaner";

            task.cleaner = replacementCleaner._id;
            task.status = "assigned";
            task.startedAt = undefined;
            task.qrVerified = false;
            task.startedLocation = undefined;
            task.reviewHistory = [
                ...(task.reviewHistory || []),
                {
                    type: "reassigned",
                    actor,
                    message: `${previousCleanerName} ended shift before completion. Task reassigned to ${nextCleanerName}.`,
                },
            ];
            await task.save();

            await Cleaner.findByIdAndUpdate(replacementCleaner._id, {
                status: "busy",
                $inc: { assignedTasks: 1 },
            });

            await Cleaner.findByIdAndUpdate(cleaner._id, {
                $inc: { assignedTasks: -1 },
            });

            reassignedTaskIds.push(String(task._id));
        }

        cleaner.status = "off-shift";
        cleaner.lastShiftEndedAt = new Date();
        cleaner.lastInactiveActionDate = todayKey;
        cleaner.approvalHistory = [
            ...(cleaner.approvalHistory || []),
            {
                action: "deactivated",
                actor,
                note: note || "Cleaner completed shift and is now off-shift.",
            },
        ];
        await cleaner.save();

        res.json({
            message: reassignedTaskIds.length > 0
                ? `Shift completed. ${reassignedTaskIds.length} unfinished task(s) were reassigned to other cleaner(s).`
                : "Shift completed. You are now off-shift and won't receive new tasks.",
            reassignedTaskIds,
            cleaner: toPublicCleaner(cleaner),
        });
    } catch (error) {
        await reportFailure("cleanerController.updateSelfShiftStatus", error);
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    getAllCleaners,
    createCleaner,
    requestCleanerSignup,
    cleanerLogin,
    getPendingCleanerRequests,
    approveCleanerRequest,
    rejectCleanerRequest,
    updateCleanerRoster,
    updateSelfShiftStatus,
};
