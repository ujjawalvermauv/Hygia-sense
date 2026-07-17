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

        // Create sample toilets (4 per floor to match dashboard display)
        const toilets = await Toilet.create([
            // Ground Floor
            { name: "Washroom 1A", floor: "Ground Floor", aqi: 45, waterCondition: "good", occupancy: false, cleanlinessStatus: "green" },
            { name: "Washroom 1B", floor: "Ground Floor", aqi: 55, waterCondition: "good", occupancy: true, cleanlinessStatus: "green" },
            { name: "Washroom 1C", floor: "Ground Floor", aqi: 65, waterCondition: "bad", occupancy: false, cleanlinessStatus: "orange" },
            { name: "Washroom 1D", floor: "Ground Floor", aqi: 50, waterCondition: "good", occupancy: false, cleanlinessStatus: "green" },

            // First Floor
            { name: "Washroom 2A", floor: "First Floor", aqi: 75, waterCondition: "good", occupancy: true, cleanlinessStatus: "orange" },
            { name: "Washroom 2B", floor: "First Floor", aqi: 85, waterCondition: "good", occupancy: false, cleanlinessStatus: "green" },
            { name: "Washroom 2C", floor: "First Floor", aqi: 95, waterCondition: "bad", occupancy: false, cleanlinessStatus: "orange" },
            { name: "Washroom 2D", floor: "First Floor", aqi: 65, waterCondition: "good", occupancy: false, cleanlinessStatus: "green" },

            // Second Floor
            { name: "Washroom 3A", floor: "Second Floor", aqi: 120, waterCondition: "good", occupancy: false, cleanlinessStatus: "orange" },
            { name: "Washroom 3B", floor: "Second Floor", aqi: 100, waterCondition: "bad", occupancy: true, cleanlinessStatus: "orange" },
            { name: "Washroom 3C", floor: "Second Floor", aqi: 110, waterCondition: "bad", occupancy: false, cleanlinessStatus: "red" },
            { name: "Washroom 3D", floor: "Second Floor", aqi: 95, waterCondition: "bad", occupancy: false, cleanlinessStatus: "orange" },

            // Third Floor
            { name: "Washroom 4A", floor: "Third Floor", aqi: 150, waterCondition: "bad", occupancy: false, cleanlinessStatus: "red" },
            { name: "Washroom 4B", floor: "Third Floor", aqi: 130, waterCondition: "bad", occupancy: true, cleanlinessStatus: "orange" },
            { name: "Washroom 4C", floor: "Third Floor", aqi: 90, waterCondition: "good", occupancy: false, cleanlinessStatus: "orange" },
            { name: "Washroom 4D", floor: "Third Floor", aqi: 110, waterCondition: "bad", occupancy: false, cleanlinessStatus: "orange" },

            // Fourth Floor
            { name: "Washroom 5A", floor: "Fourth Floor", aqi: 60, waterCondition: "good", occupancy: false, cleanlinessStatus: "green" },
            { name: "Washroom 5B", floor: "Fourth Floor", aqi: 70, waterCondition: "good", occupancy: true, cleanlinessStatus: "green" },
            { name: "Washroom 5C", floor: "Fourth Floor", aqi: 80, waterCondition: "bad", occupancy: false, cleanlinessStatus: "orange" },
            { name: "Washroom 5D", floor: "Fourth Floor", aqi: 85, waterCondition: "good", occupancy: false, cleanlinessStatus: "green" },
        ]);
        console.log("✅ Created", toilets.length, "toilets");

        // Create sample cleaners
        const cleaners = await Cleaner.create([
            {
                name: "Rajesh Kumar",
                email: "rajesh@gmail.com",
                password: "password123",
                mobileNumber: "+919876543210",
                shift: "morning",
                shiftLabel: "Morning (6 AM - 2 PM)",
                approvalStatus: "approved",
                accountStatus: "active",
                status: "available",
                assignedTasks: 0,
                completedTasks: 15,
            },
            {
                name: "Priya Sharma",
                email: "priya@gmail.com",
                password: "password123",
                mobileNumber: "+919876543211",
                shift: "afternoon",
                shiftLabel: "Afternoon (2 PM - 10 PM)",
                approvalStatus: "approved",
                accountStatus: "active",
                status: "busy",
                assignedTasks: 2,
                completedTasks: 28,
            },
            {
                name: "Amit Patel",
                email: "amit@gmail.com",
                password: "password123",
                mobileNumber: "+919876543212",
                shift: "night",
                shiftLabel: "Night (10 PM - 6 AM)",
                approvalStatus: "approved",
                accountStatus: "active",
                status: "available",
                assignedTasks: 1,
                completedTasks: 22,
            },
            {
                name: "Sunita Devi",
                email: "sunita@gmail.com",
                password: "password123",
                mobileNumber: "+919876543213",
                shift: "morning",
                shiftLabel: "Morning (6 AM - 2 PM)",
                approvalStatus: "approved",
                accountStatus: "active",
                status: "available",
                assignedTasks: 0,
                completedTasks: 35,
            },
            {
                name: "Vikram Singh",
                email: "vikram@gmail.com",
                password: "password123",
                mobileNumber: "+919876543214",
                shift: "afternoon",
                shiftLabel: "Afternoon (2 PM - 10 PM)",
                approvalStatus: "approved",
                accountStatus: "active",
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
