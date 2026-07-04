const Result = require("../models/Result");
const User = require("../models/User");
const Subject = require("../models/Subject");
const { computeGrade } = require("../utils/grading");

// @route  POST /api/results/enter
// @access Private (admin, teacher)
// Body: { subject: subjectId, records: [{ student: studentId, internalMarks, externalMarks }, ...] }
const enterResults = async (req, res) => {
  try {
    const { subject, records } = req.body;

    if (!subject || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "Subject and at least one record are required" });
    }

    const subjectExists = await Subject.findById(subject);
    if (!subjectExists) {
      return res.status(404).json({ message: "Subject not found" });
    }

    for (const r of records) {
      if (
        r.internalMarks == null || r.externalMarks == null ||
        r.internalMarks < 0 || r.internalMarks > 30 ||
        r.externalMarks < 0 || r.externalMarks > 70
      ) {
        return res.status(400).json({
          message: "Internal marks must be 0-30 and external marks 0-70 for every student",
        });
      }
    }

    const operations = records.map((r) => {
      const totalMarks = Number(r.internalMarks) + Number(r.externalMarks);
      const { grade, gradePoint } = computeGrade(totalMarks);

      return {
        updateOne: {
          filter: { student: r.student, subject },
          update: {
            $set: {
              internalMarks: r.internalMarks,
              externalMarks: r.externalMarks,
              totalMarks,
              grade,
              gradePoint,
              enteredBy: req.user._id,
            },
          },
          upsert: true,
        },
      };
    });

    await Result.bulkWrite(operations);

    res.json({ message: `Results saved for ${records.length} student(s)` });
  } catch (err) {
    res.status(500).json({ message: "Failed to save results", error: err.message });
  }
};

// @route  GET /api/results?subject=
// @access Private (admin, teacher)
// Returns existing results for a subject, used to prefill the marks-entry UI
const getResultsBySubject = async (req, res) => {
  try {
    const { subject } = req.query;
    if (!subject) {
      return res.status(400).json({ message: "Subject is required" });
    }
    const results = await Result.find({ subject }).select("student internalMarks externalMarks");
    res.json({ results });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch results", error: err.message });
  }
};

// Shared logic: build a student's full mark sheet + SGPA for a given semester (or all semesters)
const buildStudentMarksheet = async (studentId, semester) => {
  const subjectFilter = semester ? { semester: Number(semester) } : {};
  const subjectIds = semester ? (await Subject.find(subjectFilter).select("_id")).map((s) => s._id) : null;

  const resultFilter = { student: studentId };
  if (subjectIds) resultFilter.subject = { $in: subjectIds };

  const results = await Result.find(resultFilter).populate("subject", "name code semester credits");

  const rows = results
    .filter((r) => r.subject)
    .map((r) => ({
      subjectId: r.subject._id,
      code: r.subject.code,
      name: r.subject.name,
      semester: r.subject.semester,
      credits: r.subject.credits,
      internalMarks: r.internalMarks,
      externalMarks: r.externalMarks,
      totalMarks: r.totalMarks,
      grade: r.grade,
      gradePoint: r.gradePoint,
    }));

  const totalCredits = rows.reduce((sum, r) => sum + r.credits, 0);
  const weightedPoints = rows.reduce((sum, r) => sum + r.credits * r.gradePoint, 0);
  const sgpa = totalCredits ? Math.round((weightedPoints / totalCredits) * 100) / 100 : 0;

  return { subjects: rows, sgpa, totalCredits };
};

// @route  GET /api/results/student/:studentId?semester=
// @access Private (admin, teacher)
const getStudentMarksheet = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.studentId, role: "student" });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    const marksheet = await buildStudentMarksheet(req.params.studentId, req.query.semester);
    res.json({
      student: { id: student._id, name: student.name, enrollmentNo: student.enrollmentNo },
      ...marksheet,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch marksheet", error: err.message });
  }
};

// @route  GET /api/results/me?semester=
// @access Private (student — their own record only)
const getMyMarksheet = async (req, res) => {
  try {
    const marksheet = await buildStudentMarksheet(req.user._id, req.query.semester);
    res.json({
      student: { id: req.user._id, name: req.user.name, enrollmentNo: req.user.enrollmentNo },
      ...marksheet,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch marksheet", error: err.message });
  }
};

module.exports = {
  enterResults,
  getResultsBySubject,
  getStudentMarksheet,
  getMyMarksheet,
};
