const express = require("express");
const router = express.Router();

const cleanerController = require("../controllers/cleanerController");

router.get("/", cleanerController.getAllCleaners);
router.post("/", cleanerController.createCleaner);

module.exports = router;
