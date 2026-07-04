// GTU-style absolute grading scale based on total marks out of 100
const computeGrade = (totalMarks) => {
  if (totalMarks >= 90) return { grade: "AA", gradePoint: 10 };
  if (totalMarks >= 80) return { grade: "AB", gradePoint: 9 };
  if (totalMarks >= 70) return { grade: "BB", gradePoint: 8 };
  if (totalMarks >= 60) return { grade: "BC", gradePoint: 7 };
  if (totalMarks >= 50) return { grade: "CC", gradePoint: 6 };
  if (totalMarks >= 45) return { grade: "CD", gradePoint: 5 };
  if (totalMarks >= 40) return { grade: "DD", gradePoint: 4 };
  return { grade: "FF", gradePoint: 0 };
};

module.exports = { computeGrade };
