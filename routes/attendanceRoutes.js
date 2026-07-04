const express = require("express");
const router = express.Router();
const {
  markAttendance,
  getAttendanceByFilter,
  getStudentSummary,
  getMySummary,
} = require("../controllers/attendanceController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Student's own attendance summary — must be declared before the /:studentId route below
router.get("/summary/me", protect, authorize("student"), getMySummary);

// Admin/teacher: view any student's summary
router.get("/summary/:studentId", protect, authorize("admin", "teacher"), getStudentSummary);

// Admin/teacher: mark and view attendance for a subject+date
router.post("/mark", protect, authorize("admin", "teacher"), markAttendance);
router.get("/", protect, authorize("admin", "teacher"), getAttendanceByFilter);

module.exports = router;
