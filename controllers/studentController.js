const User = require("../models/User");

// @route  GET /api/students
// @access Private (admin, teacher)
// Supports optional query filters: ?semester=3&search=name-or-enrollment
const getStudents = async (req, res) => {
  try {
    const { semester, search } = req.query;
    const filter = { role: "student" };

    if (semester) {
      filter.semester = Number(semester);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { enrollmentNo: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const students = await User.find(filter).sort({ enrollmentNo: 1 });
    res.json({ count: students.length, students });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch students", error: err.message });
  }
};

// @route  GET /api/students/:id
// @access Private (admin, teacher)
const getStudent = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: "student" });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json({ student });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch student", error: err.message });
  }
};

// @route  POST /api/students
// @access Private (admin only)
const createStudent = async (req, res) => {
  try {
    const { name, email, password, enrollmentNo, semester, branch, contact } = req.body;

    if (!name || !email || !password || !enrollmentNo || !semester) {
      return res.status(400).json({
        message: "Name, email, password, enrollment number and semester are required",
      });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ message: "A user with this email already exists" });
    }

    const existingEnrollment = await User.findOne({ enrollmentNo });
    if (existingEnrollment) {
      return res.status(400).json({ message: "This enrollment number is already registered" });
    }

    const student = await User.create({
      name,
      email,
      password,
      role: "student",
      enrollmentNo,
      semester,
      branch: branch || "Computer Engineering",
      contact,
    });

    res.status(201).json({
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        enrollmentNo: student.enrollmentNo,
        semester: student.semester,
        branch: student.branch,
        contact: student.contact,
        isActive: student.isActive,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to create student", error: err.message });
  }
};

// @route  PUT /api/students/:id
// @access Private (admin only)
const updateStudent = async (req, res) => {
  try {
    const { name, email, enrollmentNo, semester, branch, contact, isActive } = req.body;

    const student = await User.findOne({ _id: req.params.id, role: "student" });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (email && email.toLowerCase() !== student.email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }
      student.email = email.toLowerCase();
    }

    if (enrollmentNo && enrollmentNo !== student.enrollmentNo) {
      const existingEnrollment = await User.findOne({ enrollmentNo });
      if (existingEnrollment) {
        return res.status(400).json({ message: "This enrollment number is already registered" });
      }
      student.enrollmentNo = enrollmentNo;
    }

    if (name) student.name = name;
    if (semester) student.semester = semester;
    if (branch) student.branch = branch;
    if (contact !== undefined) student.contact = contact;
    if (isActive !== undefined) student.isActive = isActive;

    await student.save();

    res.json({
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        enrollmentNo: student.enrollmentNo,
        semester: student.semester,
        branch: student.branch,
        contact: student.contact,
        isActive: student.isActive,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update student", error: err.message });
  }
};

// @route  DELETE /api/students/:id
// @access Private (admin only)
const deleteStudent = async (req, res) => {
  try {
    const student = await User.findOneAndDelete({ _id: req.params.id, role: "student" });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete student", error: err.message });
  }
};

module.exports = { getStudents, getStudent, createStudent, updateStudent, deleteStudent };
