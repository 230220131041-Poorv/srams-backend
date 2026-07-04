const mongoose = require("mongoose");
const { computeGrade } = require("../utils/grading");

const resultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    // Internal / continuous assessment marks, out of 30 (GTU convention)
    internalMarks: {
      type: Number,
      required: true,
      min: 0,
      max: 30,
    },
    // External / semester-end exam marks, out of 70 (GTU convention)
    externalMarks: {
      type: Number,
      required: true,
      min: 0,
      max: 70,
    },
    totalMarks: {
      type: Number,
    },
    grade: {
      type: String,
    },
    gradePoint: {
      type: Number,
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// One result per student per subject
resultSchema.index({ student: 1, subject: 1 }, { unique: true });

// Compute total, grade and grade point automatically whenever marks are set/changed.
// Note: this only fires on document.save() — the bulk marks-entry endpoint uses
// bulkWrite (which skips document middleware) and computes these fields itself
// using the same computeGrade() helper, so both paths stay in sync.
resultSchema.pre("save", function () {
  if (this.isModified("internalMarks") || this.isModified("externalMarks")) {
    this.totalMarks = this.internalMarks + this.externalMarks;
    const { grade, gradePoint } = computeGrade(this.totalMarks);
    this.grade = grade;
    this.gradePoint = gradePoint;
  }
});

module.exports = mongoose.model("Result", resultSchema);
