const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Subject code is required"],
      trim: true,
      uppercase: true,
      unique: true,
    },
    semester: {
      type: Number,
      required: [true, "Semester is required"],
      min: 1,
      max: 8,
    },
    // Used for SGPA calculation (credits × grade point, per GTU norms)
    credits: {
      type: Number,
      required: [true, "Credits are required"],
      min: 1,
      max: 10,
      default: 4,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subject", subjectSchema);
