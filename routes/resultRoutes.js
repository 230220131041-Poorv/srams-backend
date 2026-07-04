const express = require("express");
const router = express.Router();
const {
  enterResults,
  getResultsBySubject,
  getStudentMarksheet,
  getMyMarksheet,
} = require("../controllers/resultController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Student's own marksheet — declared before /student/:studentId
router.get("/me", protect, authorize("student"), getMyMarksheet);

// Admin/teacher: view any student's marksheet
router.get("/student/:studentId", protect, authorize("admin", "teacher"), getStudentMarksheet);

// Admin/teacher: enter and view results for a subject
router.post("/enter", protect, authorize("admin", "teacher"), enterResults);
router.get("/", protect, authorize("admin", "teacher"), getResultsBySubject);

module.exports = router;
