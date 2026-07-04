const express = require("express");
const router = express.Router();
const {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
} = require("../controllers/studentController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Both admin and teacher can view students
router.get("/", protect, authorize("admin", "teacher"), getStudents);
router.get("/:id", protect, authorize("admin", "teacher"), getStudent);

// Only admin can create, update, or delete student records
router.post("/", protect, authorize("admin"), createStudent);
router.put("/:id", protect, authorize("admin"), updateStudent);
router.delete("/:id", protect, authorize("admin"), deleteStudent);

module.exports = router;
