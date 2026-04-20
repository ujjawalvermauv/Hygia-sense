require("dotenv").config();
const mongoose = require("mongoose");
const Cleaner = require("../server/models/Cleaner");

const DEFAULT_MOBILE = "+919140525426";

async function run() {
    await mongoose.connect(process.env.MONGO_URI);

    const result = await Cleaner.updateMany(
        {
            $or: [
                { mobileNumber: { $exists: false } },
                { mobileNumber: null },
                { mobileNumber: "" },
            ],
        },
        {
            $set: {
                mobileNumber: DEFAULT_MOBILE,
            },
        }
    );

    console.log(`matched: ${result.matchedCount}, modified: ${result.modifiedCount}`);
}

run()
    .catch((error) => {
        console.error("Backfill failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        try {
            await mongoose.disconnect();
        } catch (error) {
            // Ignore disconnect failures in utility script.
        }
    });
