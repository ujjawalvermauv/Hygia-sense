const express = require("express");
const { assignTask } = require("../controllers/adminTaskController");

const router = express.Router();

router.post("/assign", assignTask);

module.exports = router;
