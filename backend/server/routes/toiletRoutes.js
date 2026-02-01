const express = require("express");
const router = express.Router();

const {
    createToilet,
    getAllToilets,
    enterToilet,
} = require("../controllers/toiletController");

router.post("/", createToilet);
router.get("/", getAllToilets);

// 🚽 USER ENTER EVENT
router.put("/:toiletId/enter", enterToilet);

module.exports = router;
