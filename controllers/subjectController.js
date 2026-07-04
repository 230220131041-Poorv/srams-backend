const Subject = require("../models/Subject");

// @route  GET /api/subjects
// @access Private (any authenticated user — needed for dropdowns)
const getSubjects = async (req, res) => {
  try {
    const { semester } = req.query;
    const filter = {};
    if (semester) filter.semester = Number(semester);

    const subjects = await Subject.find(filter).sort({ semester: 1, name: 1 });
    res.json({ count: subjects.length, subjects });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch subjects", error: err.message });
  }
};

// @route  POST /api/subjects
// @access Private (admin only)
const createSubject = async (req, res) => {
  try {
    const { name, code, semester, credits } = req.body;

    if (!name || !code || !semester) {
      return res.status(400).json({ message: "Name, code and semester are required" });
    }

    const existing = await Subject.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: "A subject with this code already exists" });
    }

    const subject = await Subject.create({ name, code, semester, credits: credits || 4 });
    res.status(201).json({ subject });
  } catch (err) {
    res.status(500).json({ message: "Failed to create subject", error: err.message });
  }
};

// @route  PUT /api/subjects/:id
// @access Private (admin only)
const updateSubject = async (req, res) => {
  try {
    const { name, code, semester, credits } = req.body;
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    if (code && code.toUpperCase() !== subject.code) {
      const existing = await Subject.findOne({ code: code.toUpperCase() });
      if (existing) {
        return res.status(400).json({ message: "A subject with this code already exists" });
      }
      subject.code = code;
    }

    if (name) subject.name = name;
    if (semester) subject.semester = semester;
    if (credits) subject.credits = credits;

    await subject.save();
    res.json({ subject });
  } catch (err) {
    res.status(500).json({ message: "Failed to update subject", error: err.message });
  }
};

// @route  DELETE /api/subjects/:id
// @access Private (admin only)
const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }
    res.json({ message: "Subject deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete subject", error: err.message });
  }
};

module.exports = { getSubjects, createSubject, updateSubject, deleteSubject };
