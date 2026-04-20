const mongoose = require("mongoose");

const adminRecipientSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        phoneNumber: {
            type: String,
            required: true,
            trim: true,
        },
        enabled: {
            type: Boolean,
            default: true,
        },
    },
    { _id: false }
);

const alertSettingsSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            unique: true,
            default: "default",
        },
        adminRecipients: {
            type: [adminRecipientSchema],
            default: [],
        },
        cleanerAlertsEnabled: {
            type: Boolean,
            default: true,
        },
        alertDeliveryMode: {
            type: String,
            enum: ["sms", "whatsapp", "auto"],
            default: "sms",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("AlertSettings", alertSettingsSchema);
