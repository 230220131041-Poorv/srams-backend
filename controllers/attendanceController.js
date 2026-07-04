const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Subject = require("../models/Subject");

// @route  POST /api/attendance/mark
// @access Private (admin, teacher)
// Body: { subject: subjectId, date: "2026-07-03", records: [{ student: studentId, status: "present"|"absent" }, ...] }
// Upserts one attendance row per student for that subject+date (safe to re-mark the same day).
const markAttendance = async (req, res) => {
  try {
    const { subject, date, records } = req.body;

    if (!subject || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "Subject, date and at least one record are required" });
    }

    const subjectExists = await Subject.findById(subject);
    if (!subjectExists) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const operations = records.map((r) => ({
      updateOne: {
        filter: { student: r.student, subject, date: attendanceDate },
        update: {
          $set: {
            status: r.status,
            markedBy: req.user._id,
          },
        },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(operations);

    res.json({ message: `Attendance saved for ${records.length} student(s)` });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark attendance", error: err.message });
  }
};

// @route  GET /api/attendance?subject=&date=
// @access Private (admin, teacher)
// Returns existing attendance records for a subject+date, used to prefill the marking UI
const getAttendanceByFilter = async (req, res) => {
  try {
    const { subject, date } = req.query;
    if (!subject || !date) {
      return res.status(400).json({ message: "Subject and date are required" });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const records = await Attendance.find({ subject, date: attendanceDate }).select("student status");
    res.json({ records });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch attendance", error: err.message });
  }
};

// Shared logic: build per-subject and overall attendance percentage for one student
const buildStudentSummary = async (studentId) => {
  const records = await Attendance.find({ student: studentId }).populate("subject", "name code semester");

  const bySubject = {};
  records.forEach((r) => {
    if (!r.subject) return;
    const key = r.subject._id.toString();
    if (!bySubject[key]) {
      bySubject[key] = {
        subjectId: key,
        name: r.subject.name,
        code: r.subject.code,
        present: 0,
        total: 0,
      };
    }
    bySubject[key].total += 1;
    if (r.status === "present") bySubject[key].present += 1;
  });

  const subjectSummaries = Object.values(bySubject).map((s) => ({
    ...s,
    percentage: s.total ? Math.round((s.present / s.total) * 1000) / 10 : 0,
  }));

  const totalPresent = subjectSummaries.reduce((sum, s) => sum + s.present, 0);
  const totalClasses = subjectSummaries.reduce((sum, s) => sum + s.total, 0);
  const overallPercentage = totalClasses ? Math.round((totalPresent / totalClasses) * 1000) / 10 : 0;

  return { subjects: subjectSummaries, overallPercentage, totalClasses, totalPresent };
};

// @route  GET /api/attendance/summary/:studentId
// @access Private (admin, teacher)
const getStudentSummary = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.studentId, role: "student" });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    const summary = await buildStudentSummary(req.params.studentId);
    res.json({ student: { id: student._id, name: student.name, enrollmentNo: student.enrollmentNo }, ...summary });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch summary", error: err.message });
  }
};

// @route  GET /api/attendance/summary/me
// @access Private (student — their own record only)
const getMySummary = async (req, res) => {
  try {
    const summary = await buildStudentSummary(req.user._id);
    res.json({ student: { id: req.user._id, name: req.user.name, enrollmentNo: req.user.enrollmentNo }, ...summary });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch summary", error: err.message });
  }
};

module.exports = { markAttendance, getAttendanceByFilter, getStudentSummary, getMySummary };
