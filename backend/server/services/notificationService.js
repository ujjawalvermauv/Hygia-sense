const AlertEvent = require("../models/AlertEvent");
const AlertSettings = require("../models/AlertSettings");
const Cleaner = require("../models/Cleaner");

const parseRecipients = (value) =>
    String(value || "")
        .split(",")
        .map((row) => row.trim())
        .filter(Boolean);

const normalizePhone = (value) => {
    const normalized = String(value || "").trim();
    if (!normalized) return "";
    const digits = normalized.replace(/\D/g, "");
    if (!digits) return "";
    if (normalized.startsWith("+")) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    return `+${digits}`;
};

const normalizePhoneDigits = (value) => normalizePhone(value).replace(/\D/g, "");

const composeWhatsAppLink = (number, message) => {
    const digits = normalizePhoneDigits(number);
    if (!digits) return "";
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
};

const toWhatsAppAddress = (value) => {
    const normalized = String(value || "").trim();
    if (!normalized) return "";
    return normalized.startsWith("whatsapp:") ? normalized : `whatsapp:${normalized}`;
};

const hasTwilioWhatsAppConfig = () =>
    Boolean(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_WHATSAPP_FROM
    );

const getTwilioSmsFrom = () =>
    normalizePhone(process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_SMS_FROM);

const hasTwilioSmsConfig = () =>
    Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && getTwilioSmsFrom());

const hasWhatsAppCloudConfig = () =>
    Boolean(process.env.WHATSAPP_CLOUD_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

const normalizeDeliveryMode = (value) => {
    const mode = String(value || "sms").trim().toLowerCase();
    if (mode === "sms" || mode === "whatsapp" || mode === "auto") return mode;
    return "sms";
};

const getWhatsAppTransportLabel = () => {
    if (hasWhatsAppCloudConfig()) return "whatsapp-cloud-api";
    if (hasTwilioWhatsAppConfig()) return "twilio-whatsapp";
    return "log";
};

const getWhatsAppRecipients = async () => {
    const settings = await getAlertSettings();
    const configured = (settings?.adminRecipients || [])
        .filter((row) => row?.enabled !== false)
        .map((row) => normalizePhone(row?.phoneNumber))
        .filter(Boolean);

    if (configured.length > 0) return configured;

    return parseRecipients(process.env.ADMIN_WHATSAPP_NUMBERS).map(normalizePhone).filter(Boolean);
};

const failureAlertTracker = new Map();
const FAILURE_ALERT_COOLDOWN_MS = Number(process.env.ALERT_FAILURE_COOLDOWN_MS || 300000);

const persistAlertEvent = async ({
    eventType,
    source,
    channel,
    message,
    recipients,
    delivered,
    suppressed = false,
    reason = null,
    results = null,
    fallbackLinks = [],
}) => {
    try {
        await AlertEvent.create({
            eventType,
            source,
            channel,
            message,
            recipients,
            delivered,
            suppressed,
            reason,
            results,
            fallbackLinks,
        });
    } catch (error) {
        console.error("Failed to persist alert event:", error.message);
    }
};

const getAlertSettings = async () => {
    try {
        return await AlertSettings.findOne({ key: "default" }).lean();
    } catch (error) {
        return null;
    }
};

const getAlertDeliveryMode = async () => {
    const settings = await getAlertSettings();
    if (settings?.alertDeliveryMode) {
        return normalizeDeliveryMode(settings.alertDeliveryMode);
    }

    return normalizeDeliveryMode(process.env.ALERT_DELIVERY_MODE || "sms");
};

const getAdminPhoneRecipients = async () => {
    const settings = await getAlertSettings();
    const configured = (settings?.adminRecipients || [])
        .filter((row) => row?.enabled !== false)
        .map((row) => normalizePhone(row?.phoneNumber))
        .filter(Boolean);

    if (configured.length > 0) return configured;

    return parseRecipients(process.env.ADMIN_PHONE_NUMBERS).map(normalizePhone).filter(Boolean);
};

const getAllCleanerPhoneRecipients = async () => {
    try {
        const cleaners = await Cleaner.find(
            {
                mobileNumber: { $exists: true, $ne: null },
                approvalStatus: { $in: ["approved", null] },
                accountStatus: { $in: ["active", null] },
            },
            { mobileNumber: 1 }
        ).lean();

        return cleaners
            .map((row) => normalizePhone(row?.mobileNumber))
            .filter(Boolean);
    } catch (error) {
        console.error("Failed to fetch cleaner phone recipients:", error.message);
        return [];
    }
};

const mergeUniqueRecipients = (...groups) => {
    const seen = new Set();
    const merged = [];

    for (const group of groups) {
        for (const recipient of group || []) {
            const normalized = normalizePhone(recipient);
            if (!normalized || seen.has(normalized)) continue;
            seen.add(normalized);
            merged.push(normalized);
        }
    }

    return merged;
};

const getAdminWhatsAppRecipients = async () => {
    return getWhatsAppRecipients();
};

const shouldSendCleanerAlerts = async () => {
    const settings = await getAlertSettings();
    return settings?.cleanerAlertsEnabled !== false;
};

const shouldSuppressFailureAlert = (source) => {
    const key = String(source || "system").trim().toLowerCase();
    const now = Date.now();
    const lastSent = failureAlertTracker.get(key);

    if (lastSent && now - lastSent < FAILURE_ALERT_COOLDOWN_MS) {
        return {
            suppressed: true,
            key,
            nextAllowedInMs: FAILURE_ALERT_COOLDOWN_MS - (now - lastSent),
        };
    }

    failureAlertTracker.set(key, now);
    return {
        suppressed: false,
        key,
        nextAllowedInMs: 0,
    };
};

const sendTwilioMessage = async ({
    recipients,
    from,
    message,
    channel,
    missingRecipientReason,
    missingConfigReason = "Twilio credentials or sender missing",
    eventType,
    source,
    fallbackLinks,
}) => {
    if (recipients.length === 0) {
        console.log(`[Admin Notification] ${message}`);
        const result = {
            delivered: false,
            channel: "log",
            recipients: [],
            message,
            reason: missingRecipientReason,
        };

        await persistAlertEvent({
            eventType,
            source,
            channel: result.channel,
            message,
            recipients: result.recipients,
            delivered: result.delivered,
            reason: result.reason,
            fallbackLinks,
        });

        return result;
    }

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;

    if (!twilioSid || !twilioToken || !from) {
        console.log(`[Admin Notification -> ${recipients.join(", ")}] ${message}`);
        const result = {
            delivered: false,
            channel: "log",
            recipients,
            message,
            reason: missingConfigReason,
        };

        await persistAlertEvent({
            eventType,
            source,
            channel: result.channel,
            message,
            recipients: result.recipients,
            delivered: result.delivered,
            reason: result.reason,
            fallbackLinks,
        });

        return result;
    }

    const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
    const results = [];

    for (const to of recipients) {
        try {
            const body = new URLSearchParams({
                To: to,
                From: from,
                Body: message,
            });

            const response = await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Basic ${auth}`,
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body,
                }
            );

            const payload = await response.json();

            results.push({
                to,
                success: response.ok,
                sid: payload.sid,
                error: payload.message,
            });
        } catch (error) {
            results.push({
                to,
                success: false,
                error: error.message,
            });
        }
    }

    const result = {
        delivered: results.some((row) => row.success),
        channel,
        recipients,
        message,
        results,
    };

    await persistAlertEvent({
        eventType,
        source,
        channel: result.channel,
        message,
        recipients: result.recipients,
        delivered: result.delivered,
        results: result.results,
        fallbackLinks,
    });

    return result;
};

const sendWhatsAppCloudMessage = async ({ recipients, message, eventType, source }) => {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
    const version = process.env.WHATSAPP_CLOUD_API_VERSION || "v21.0";

    if (!phoneNumberId || !token) {
        return {
            delivered: false,
            channel: "log",
            recipients,
            message,
            reason: "WhatsApp Cloud API credentials missing",
        };
    }

    const results = [];

    for (const recipient of recipients) {
        const to = normalizePhoneDigits(recipient);
        if (!to) {
            results.push({ to: recipient, success: false, error: "Invalid recipient number" });
            continue;
        }

        try {
            const response = await fetch(
                `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        messaging_product: "whatsapp",
                        to,
                        type: "text",
                        text: {
                            preview_url: false,
                            body: message,
                        },
                    }),
                }
            );

            const payload = await response.json().catch(() => ({}));

            results.push({
                to,
                success: response.ok,
                messageId: payload?.messages?.[0]?.id,
                error: payload?.error?.message || payload?.error || null,
            });
        } catch (error) {
            results.push({
                to,
                success: false,
                error: error.message,
            });
        }
    }

    const result = {
        delivered: results.some((row) => row.success),
        channel: "whatsapp-cloud-api",
        recipients,
        message,
        results,
    };

    await persistAlertEvent({
        eventType,
        source,
        channel: result.channel,
        message,
        recipients: result.recipients,
        delivered: result.delivered,
        results: result.results,
        reason: result.delivered ? null : "WhatsApp Cloud API delivery failed",
        fallbackLinks: recipients.map((recipient) => composeWhatsAppLink(recipient, message)).filter(Boolean),
    });

    return result;
};

const sendAdminCleaningNotification = async ({
    toiletName,
    cleanerName,
    efficiency,
    autoApproved,
}) => {
    const phoneNumbers = await getAdminPhoneRecipients();
    const message = autoApproved
        ? `Hygia Sense: ${toiletName} cleaned by ${cleanerName}. Efficiency ${efficiency}%. Auto-approved.`
        : `Hygia Sense: ${toiletName} cleaned by ${cleanerName}. Efficiency ${efficiency}%. Admin review needed.`;

    return sendTwilioMessage({
        recipients: phoneNumbers,
        from: getTwilioSmsFrom(),
        message,
        channel: "twilio-sms",
        missingRecipientReason: "No admin phone recipients configured",
        missingConfigReason: "Twilio SMS credentials or sender missing",
        eventType: "cleaning-update",
        source: "task-review",
    });
};

const sendAdminSmsAlert = async ({ message, eventType, source, includeAllCleaners = false }) => {
    const adminRecipients = await getAdminPhoneRecipients();
    const cleanerRecipients = includeAllCleaners ? await getAllCleanerPhoneRecipients() : [];
    const recipients = mergeUniqueRecipients(adminRecipients, cleanerRecipients);

    return sendTwilioMessage({
        recipients,
        from: getTwilioSmsFrom(),
        message,
        channel: "twilio-sms",
        missingRecipientReason: includeAllCleaners
            ? "No admin or cleaner phone recipients configured"
            : "No admin phone recipients configured",
        missingConfigReason: "Twilio SMS credentials or sender missing",
        eventType,
        source,
    });
};

const sendAdminWhatsAppOnlyAlert = async ({ message, eventType, source }) => {
    const recipients = await getAdminWhatsAppRecipients();

    if (hasWhatsAppCloudConfig()) {
        return sendWhatsAppCloudMessage({ recipients, message, eventType, source });
    }

    if (hasTwilioWhatsAppConfig()) {
        return sendTwilioMessage({
            recipients: recipients.map(toWhatsAppAddress),
            from: toWhatsAppAddress(process.env.TWILIO_WHATSAPP_FROM),
            message,
            channel: "twilio-whatsapp",
            missingRecipientReason: "No admin WhatsApp recipients configured",
            missingConfigReason: "Twilio WhatsApp credentials or sender missing",
            eventType,
            source,
        });
    }

    const result = {
        delivered: false,
        channel: "log",
        recipients,
        message,
        reason: "No WhatsApp provider configured. Set WhatsApp Cloud API or Twilio credentials.",
        fallbackLinks: recipients.map((recipient) => composeWhatsAppLink(recipient, message)).filter(Boolean),
    };

    console.log(`[Admin WhatsApp -> ${recipients.join(", ")}] ${message}`);
    await persistAlertEvent({
        eventType,
        source,
        channel: result.channel,
        message,
        recipients: result.recipients,
        delivered: result.delivered,
        reason: result.reason,
        fallbackLinks: result.fallbackLinks,
    });

    return result;
};

const sendAdminWhatsAppAlert = async ({ message, eventType, source, includeAllCleaners = false }) => {
    const mode = await getAlertDeliveryMode();

    if (mode === "sms") {
        return sendAdminSmsAlert({ message, eventType, source, includeAllCleaners });
    }

    if (mode === "whatsapp") {
        return sendAdminWhatsAppOnlyAlert({ message, eventType, source });
    }

    if (hasTwilioSmsConfig()) {
        return sendAdminSmsAlert({ message, eventType, source, includeAllCleaners });
    }

    return sendAdminWhatsAppOnlyAlert({ message, eventType, source });
};

const getAdminRecipientsForMode = async () => {
    const mode = await getAlertDeliveryMode();
    if (mode === "sms") {
        return mergeUniqueRecipients(
            await getAdminPhoneRecipients(),
            await getAllCleanerPhoneRecipients()
        );
    }
    if (mode === "whatsapp") return getAdminWhatsAppRecipients();
    if (hasTwilioSmsConfig()) {
        return mergeUniqueRecipients(
            await getAdminPhoneRecipients(),
            await getAllCleanerPhoneRecipients()
        );
    }
    return getAdminWhatsAppRecipients();
};

const sendAdminCleanerSignupAlert = async ({ cleanerName, cleanerEmail, requestType = "new" }) => {
    const message = requestType === "resubmitted"
        ? `Hygia Sense Alert: Cleaner signup request resubmitted by ${cleanerName} (${cleanerEmail}). Please review in admin panel.`
        : `Hygia Sense Alert: New cleaner signup request from ${cleanerName} (${cleanerEmail}). Please approve or reject in admin panel.`;

    return sendAdminWhatsAppAlert({
        message,
        eventType: "signup-request",
        source: requestType === "resubmitted" ? "cleaner-signup-resubmitted" : "cleaner-signup",
    });
};

const sendAdminSystemFailureAlert = async ({ source, errorMessage }) => {
    const message = `Hygia Sense Failure: ${source} failed. Error: ${errorMessage}`;
    const suppressState = shouldSuppressFailureAlert(source);

    if (suppressState.suppressed) {
        const reason = `Suppressed duplicate failure alert. Cooldown active for ${Math.ceil(
            suppressState.nextAllowedInMs / 1000
        )}s.`;

        await persistAlertEvent({
            eventType: "system-failure",
            source,
            channel: "suppressed",
            message,
            recipients: await getAdminRecipientsForMode(),
            delivered: false,
            suppressed: true,
            reason,
        });

        return {
            delivered: false,
            suppressed: true,
            reason,
            message,
            channel: "suppressed",
        };
    }

    return sendAdminWhatsAppAlert({
        message,
        eventType: "system-failure",
        source,
        includeAllCleaners: true,
    });
};

const sendCleanerWhatsAppAlert = async ({ cleanerName, cleanerPhone, message, source }) => {
    const shouldSend = await shouldSendCleanerAlerts();
    const recipient = normalizePhone(cleanerPhone);

    if (!shouldSend) {
        await persistAlertEvent({
            eventType: "cleaner-alert",
            source,
            channel: "disabled",
            message,
            recipients: recipient ? [recipient] : [],
            delivered: false,
            suppressed: true,
            reason: "Cleaner alerts are disabled in admin settings",
            fallbackLinks: recipient ? [composeWhatsAppLink(recipient, message)] : [],
        });

        return {
            delivered: false,
            suppressed: true,
            reason: "Cleaner alerts are disabled in admin settings",
        };
    }

    if (!recipient) {
        await persistAlertEvent({
            eventType: "cleaner-alert",
            source,
            channel: "log",
            message,
            recipients: [],
            delivered: false,
            reason: "Cleaner mobile number is missing",
            fallbackLinks: [],
        });

        return {
            delivered: false,
            reason: "Cleaner mobile number is missing",
        };
    }

    const personalizedMessage = cleanerName
        ? `Hi ${cleanerName}, ${message}`
        : message;

    const mode = await getAlertDeliveryMode();

    if (mode === "sms") {
        return sendTwilioMessage({
            recipients: [recipient],
            from: getTwilioSmsFrom(),
            message: personalizedMessage,
            channel: "twilio-sms",
            missingRecipientReason: "Cleaner mobile number is missing",
            missingConfigReason: "Twilio SMS credentials or sender missing",
            eventType: "cleaner-alert",
            source,
        });
    }

    if (mode === "whatsapp") {
        if (hasWhatsAppCloudConfig()) {
            return sendWhatsAppCloudMessage({
                recipients: [recipient],
                message: personalizedMessage,
                eventType: "cleaner-alert",
                source,
            });
        }

        if (hasTwilioWhatsAppConfig()) {
            return sendTwilioMessage({
                recipients: [toWhatsAppAddress(recipient)],
                from: toWhatsAppAddress(process.env.TWILIO_WHATSAPP_FROM),
                message: personalizedMessage,
                channel: "twilio-whatsapp",
                missingRecipientReason: "Cleaner mobile number is missing",
                missingConfigReason: "Twilio WhatsApp credentials or sender missing",
                eventType: "cleaner-alert",
                source,
                fallbackLinks: [composeWhatsAppLink(recipient, personalizedMessage)].filter(Boolean),
            });
        }
    } else if (hasTwilioSmsConfig()) {
        return sendTwilioMessage({
            recipients: [recipient],
            from: getTwilioSmsFrom(),
            message: personalizedMessage,
            channel: "twilio-sms",
            missingRecipientReason: "Cleaner mobile number is missing",
            missingConfigReason: "Twilio SMS credentials or sender missing",
            eventType: "cleaner-alert",
            source,
        });
    }

    if (hasWhatsAppCloudConfig()) {
        return sendWhatsAppCloudMessage({
            recipients: [recipient],
            message: personalizedMessage,
            eventType: "cleaner-alert",
            source,
        });
    }

    if (hasTwilioWhatsAppConfig()) {
        return sendTwilioMessage({
            recipients: [toWhatsAppAddress(recipient)],
            from: toWhatsAppAddress(process.env.TWILIO_WHATSAPP_FROM),
            message: personalizedMessage,
            channel: "twilio-whatsapp",
            missingRecipientReason: "Cleaner mobile number is missing",
            missingConfigReason: "Twilio WhatsApp credentials or sender missing",
            eventType: "cleaner-alert",
            source,
            fallbackLinks: [composeWhatsAppLink(recipient, personalizedMessage)].filter(Boolean),
        });
    }

    const result = {
        delivered: false,
        channel: "log",
        recipients: [recipient],
        message: personalizedMessage,
        reason: "No WhatsApp provider configured. Set WhatsApp Cloud API or Twilio credentials.",
        fallbackLinks: [composeWhatsAppLink(recipient, personalizedMessage)].filter(Boolean),
    };

    console.log(`[Cleaner WhatsApp -> ${recipient}] ${personalizedMessage}`);
    await persistAlertEvent({
        eventType: "cleaner-alert",
        source,
        channel: result.channel,
        message: result.message,
        recipients: result.recipients,
        delivered: result.delivered,
        reason: result.reason,
        fallbackLinks: result.fallbackLinks,
    });

    return result;
};

module.exports = {
    sendAdminCleaningNotification,
    sendAdminWhatsAppAlert,
    sendAdminCleanerSignupAlert,
    sendAdminSystemFailureAlert,
    sendCleanerWhatsAppAlert,
};
