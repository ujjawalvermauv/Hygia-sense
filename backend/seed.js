const mongoose = require("mongoose");
require("dotenv").config();

const Toilet = require("./server/models/Toilet");
const Cleaner = require("./server/models/Cleaner");

async function seedData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // Clear existing data
        await Toilet.deleteMany({});
        await Cleaner.deleteMany({});
        console.log("Cleared existing data");

        // Create sample toilets
        const toilets = await Toilet.create([
            {
                name: "Washroom A - Ground Floor",
                aqi: 45,
                waterCondition: "good",
                occupancy: false,
                cleanlinessStatus: "green",
            },
            {
                name: "Washroom B - First Floor",
                aqi: 75,
                waterCondition: "good",
                occupancy: true,
                cleanlinessStatus: "orange",
            },
            {
                name: "Washroom C - Second Floor",
                aqi: 120,
                waterCondition: "good",
                occupancy: false,
                cleanlinessStatus: "orange",
            },
            {
                name: "Washroom D - Third Floor",
                aqi: 150,
                waterCondition: "bad",
                occupancy: false,
                cleanlinessStatus: "red",
            },
            {
                name: "Washroom E - Fourth Floor",
                aqi: 60,
                waterCondition: "good",
                occupancy: false,
                cleanlinessStatus: "green",
            },
        ]);
        console.log("✅ Created", toilets.length, "toilets");

        // Create sample cleaners
        const cleaners = await Cleaner.create([
            {
                name: "Rajesh Kumar",
                status: "available",
                assignedTasks: 0,
                completedTasks: 15,
            },
            {
                name: "Priya Sharma",
                status: "busy",
                assignedTasks: 2,
                completedTasks: 28,
            },
            {
                name: "Amit Patel",
                status: "available",
                assignedTasks: 1,
                completedTasks: 22,
            },
            {
                name: "Sunita Devi",
                status: "available",
                assignedTasks: 0,
                completedTasks: 35,
            },
            {
                name: "Vikram Singh",
                status: "busy",
                assignedTasks: 3,
                completedTasks: 18,
            },
        ]);
        console.log("✅ Created", cleaners.length, "cleaners");

        console.log("\n✅ Database seeded successfully!");
        console.log("Toilets:", toilets.map(t => t.name));
        console.log("Cleaners:", cleaners.map(c => c.name));

        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding database:", error);
        process.exit(1);
    }
}

seedData();
