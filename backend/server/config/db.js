const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        // Enhanced connection options to prevent timeouts during pooled operations
        const mongooseOptions = {
            // Connection pool settings for sensor polling (5-second intervals with multiple toilet queries)
            maxPoolSize: 100,           // Support concurrent sensor updates and API requests
            minPoolSize: 20,            // Pre-warm connections to reduce connection latency
            maxIdleTimeMS: 60000,       // Recycle idle connections after 60 seconds

            // Timeout settings to handle network delays and MongoDB monitor callbacks
            serverSelectionTimeoutMS: 5000,  // Fail fast if MongoDB unavailable (dev environment)
            socketTimeoutMS: 30000,          // 30s socket timeout for individual operations
            connectTimeoutMS: 10000,         // 10s timeout for initial connection attempt
            family: 4,                       // Use IPv4 (avoid IPv6 issues on local setups)
        };

        await mongoose.connect(process.env.MONGO_URI, mongooseOptions);
        console.log("✅ MongoDB connected successfully with optimized pool settings");
        console.log(`   Pool: min=${mongooseOptions.minPoolSize}, max=${mongooseOptions.maxPoolSize}`);
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
