const express = require("express");
const router = express.Router();
const {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} = require("../controllers/subjectController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Any logged-in user can view subjects (needed for dropdowns on every role)
router.get("/", protect, getSubjects);

// Only admin manages subjects
router.post("/", protect, authorize("admin"), createSubject);
router.put("/:id", protect, authorize("admin"), updateSubject);
router.delete("/:id", protect, authorize("admin"), deleteSubject);

module.exports = router;
