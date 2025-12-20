const xlsx = require("xlsx");

// Extracts all course codes from cells like "MOD001+YZB001+BTP212 & ECC001+AII001"

function extractCourseCodes(raw) {
  if (!raw || typeof raw !== "string") return [];

  return raw
    .split(/[+&]/)
    .map((code) => code.trim())
    .filter(Boolean);
}

/**
 * Extract department prefixes from course codes
 *  - ["SWE310", "SWE304"] -> ["SWE"]
 *  - ["MOD001", "YZB001", "BTP212"] -> ["MOD","YZB","BTP"]
 */
function deriveDepartmentsFromCodes(courseCodes) {
  const departmentSet = new Set();

  for (const courseCode of courseCodes) {
    const match = String(courseCode)
      .toUpperCase()
      .match(/^[A-ZÇĞİÖŞÜ]{3}/);

    if (match) {
      departmentSet.add(match[0]);
    }
  }

  return Array.from(departmentSet);
}

/**
 * Exams sheet: Converts each row into exam information
 *
 * output: examsData = [
 *   {
 *     courseCode: "SWE301",
 *     courseCodes: ["SWE301"],
 *     departments: ["SWE"],
 *     courseName: "...",
 *     faculty: "...",
 *     instructor: "...",
 *     students: 145
 *   },
 *   ...
 * ]
 */
function parseExamsSheet(sheet) {
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  if (!rows || rows.length === 0) return [];

  const headerRowIndex = rows.findIndex(
    (row) =>
      row &&
      row.some(
        (cell) =>
          typeof cell === "string" && cell.toUpperCase().includes("COURSE CODE")
      )
  );

  if (headerRowIndex === -1) {
    console.warn("Exams: COURSE CODE header not found");
    return [];
  }

  const headerRow = rows[headerRowIndex];

  const facultyCol = headerRow.findIndex(
    (cell) => typeof cell === "string" && cell.toUpperCase().includes("FACULTY")
  );

  const courseCodeCol = headerRow.findIndex(
    (cell) =>
      typeof cell === "string" && cell.toUpperCase().includes("COURSE CODE")
  );

  const courseNameCol = headerRow.findIndex(
    (cell) =>
      typeof cell === "string" && cell.toUpperCase().includes("COURSE NAME")
  );

  const instructorCol = headerRow.findIndex(
    (cell) =>
      typeof cell === "string" &&
      (cell.toUpperCase().includes("INSTRUCTOR") ||
        cell.toUpperCase().includes("ÖĞRETİM"))
  );

  const studentCountCol = headerRow.findIndex(
    (cell) =>
      typeof cell === "string" &&
      (cell.toUpperCase().includes("STUDENTS") ||
        cell.toUpperCase().includes("ÖĞRENCİ"))
  );

  const exams = [];

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!row) continue;

    const rawCourseCode = row[courseCodeCol];
    if (!rawCourseCode) continue;

    const courseCode = String(rawCourseCode).trim();
    if (!courseCode) continue;

    const courseCodes = extractCourseCodes(courseCode);
    const departments = deriveDepartmentsFromCodes(courseCodes);

    exams.push({
      faculty: facultyCol >= 0 ? String(row[facultyCol] || "").trim() : "",
      courseCode,
      courseCodes,
      departments,
      courseName:
        courseNameCol >= 0 ? String(row[courseNameCol] || "").trim() : "",
      instructor:
        instructorCol >= 0 ? String(row[instructorCol] || "").trim() : "",
      students:
        studentCountCol >= 0 ? Number(row[studentCountCol] || 0) || 0 : 0,
    });
  }

  return exams;
}

module.exports = { parseExamsSheet };
