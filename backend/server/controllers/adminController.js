const Toilet = require("../models/Toilet");
const Cleaner = require("../models/Cleaner");
const CleaningTask = require("../models/CleaningTask");
const AlertEvent = require("../models/AlertEvent");
const AlertSettings = require("../models/AlertSettings");

const normalizePhone = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    if (raw.startsWith("+")) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    return `+${digits}`;
};

const normalizeDeliveryMode = (value) => {
    const mode = String(value || "sms").trim().toLowerCase();
    if (mode === "sms" || mode === "whatsapp" || mode === "auto") return mode;
    return "sms";
};

const getOrCreateSettings = async () => {
    let settings = await AlertSettings.findOne({ key: "default" });
    if (!settings) {
        settings = await AlertSettings.create({ key: "default" });
    }
    return settings;
};

exports.getAdminDashboard = async (req, res) => {
    try {
        const toilets = await Toilet.find();

        const cleaners = await Cleaner.find();

        const tasks = await CleaningTask.find()
            .populate("toilet", "name cleanlinessStatus")
            .populate("cleaner", "name status");

        res.json({
            toilets,
            cleaners,
            tasks,
            summary: {
                totalToilets: toilets.length,
                totalCleaners: cleaners.length,
                activeTasks: tasks.filter(t => t.status !== "completed").length,
            },
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.getCleanerAnalytics = async (req, res) => {
    try {
        const cleaners = await Cleaner.find();

        const analytics = [];

        for (const cleaner of cleaners) {
            const totalTasks = await CleaningTask.countDocuments({
                cleaner: cleaner._id,
            });

            const completedTasks = await CleaningTask.countDocuments({
                cleaner: cleaner._id,
                status: "completed",
            });

            const pendingTasks = totalTasks - completedTasks;

            const completionRate =
                totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

            analytics.push({
                cleanerId: cleaner._id,
                name: cleaner.name,
                status: cleaner.status,
                totalTasks,
                completedTasks,
                pendingTasks,
                completionRate: `${completionRate}%`,
            });
        }

        res.json(analytics);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getAdminAlerts = async (req, res) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 500);
        const eventType = String(req.query.eventType || "").trim();
        const status = String(req.query.status || "").trim().toLowerCase();

        const filter = {};

        if (eventType) {
            filter.eventType = eventType;
        }

        if (status === "sent") {
            filter.delivered = true;
            filter.suppressed = false;
        } else if (status === "failed") {
            filter.delivered = false;
            filter.suppressed = false;
        } else if (status === "suppressed") {
            filter.suppressed = true;
        }

        const alerts = await AlertEvent.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        res.json({
            count: alerts.length,
            alerts,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getAlertSettings = async (req, res) => {
    try {
        const settings = await getOrCreateSettings();

        res.json({
            adminRecipients: settings.adminRecipients || [],
            cleanerAlertsEnabled: settings.cleanerAlertsEnabled !== false,
            alertDeliveryMode: normalizeDeliveryMode(settings.alertDeliveryMode),
            updatedAt: settings.updatedAt,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateAlertSettings = async (req, res) => {
    try {
        const incomingRecipients = Array.isArray(req.body.adminRecipients)
            ? req.body.adminRecipients
            : [];

        const adminRecipients = incomingRecipients
            .map((row) => ({
                name: String(row?.name || "").trim(),
                phoneNumber: normalizePhone(row?.phoneNumber),
                enabled: row?.enabled !== false,
            }))
            .filter((row) => row.name && row.phoneNumber);

        const cleanerAlertsEnabled = req.body.cleanerAlertsEnabled !== false;
        const alertDeliveryMode = normalizeDeliveryMode(req.body.alertDeliveryMode);

        const settings = await getOrCreateSettings();
        settings.adminRecipients = adminRecipients;
        settings.cleanerAlertsEnabled = cleanerAlertsEnabled;
        settings.alertDeliveryMode = alertDeliveryMode;
        await settings.save();

        res.json({
            message: "Alert settings updated.",
            adminRecipients: settings.adminRecipients || [],
            cleanerAlertsEnabled: settings.cleanerAlertsEnabled !== false,
            alertDeliveryMode: normalizeDeliveryMode(settings.alertDeliveryMode),
            updatedAt: settings.updatedAt,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
