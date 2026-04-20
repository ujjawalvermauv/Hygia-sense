const express = require("express");
const router = express.Router();

const cleanerController = require("../controllers/cleanerController");

router.get("/", cleanerController.getAllCleaners);
router.post("/", cleanerController.createCleaner);
router.post("/signup-request", cleanerController.requestCleanerSignup);
router.post("/login", cleanerController.cleanerLogin);
router.get("/pending", cleanerController.getPendingCleanerRequests);
router.put("/:cleanerId/approve", cleanerController.approveCleanerRequest);
router.put("/:cleanerId/reject", cleanerController.rejectCleanerRequest);
router.put("/:cleanerId/roster", cleanerController.updateCleanerRoster);
router.put("/:cleanerId/self-shift", cleanerController.updateSelfShiftStatus);

module.exports = router;
