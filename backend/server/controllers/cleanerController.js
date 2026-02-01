const Cleaner = require("../models/Cleaner");

// GET all cleaners
async function getAllCleaners(req, res) {
    try {
        const cleaners = await Cleaner.find();
        res.json(cleaners);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// CREATE cleaner
async function createCleaner(req, res) {
    try {
        const cleaner = new Cleaner(req.body);
        const savedCleaner = await cleaner.save();
        res.status(201).json(savedCleaner);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}

module.exports = {
    getAllCleaners,
    createCleaner
};
