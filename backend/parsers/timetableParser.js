const xlsx = require("xlsx");

/**
 * Parse the course code part within the cell:
 *  - "SWE395 POLAWALE"          -> ["SWE395"]
 *  - "MTH113A+MTH133B ADENKER"  -> ["MTH113A", "MTH133B"]
 */
function extractCourseCodesFromCellText(cellText) {
  if (!cellText || typeof cellText !== "string") return [];

  const upperText = cellText.toUpperCase();

  // Joint courses, exam notes, date cells, etc. are completely ignored
  if (
    upperText.includes("ORTAK DERSLER") ||
    upperText.includes("SINAV") ||
    upperText.match(/\b(EKİM|KASIM|ARALIK)\b/i)
  ) {
    return [];
  }

  // Single markers like "X" are not considered courses
  if (upperText.trim() === "X") return [];

  // The part up to the first space is considered the course code field
  const firstPart = cellText.split(/\s+/)[0].trim();
  if (!firstPart) return [];

  // There may be multiple codes separated by + or &
  return firstPart
    .split(/[+&]/)
    .map((code) => code.trim())
    .filter(Boolean);
}

/**
 * Extract the department prefix from a course code.
 *  - "SWE395" -> "SWE"
 *  - "AII102+ECC102" In this case, it will already be split.
 */
function departmentFromCode(code) {
  if (!code || typeof code !== "string") return null;

  const match = code.toUpperCase().match(/^[A-ZÇĞİÖŞÜ]{3}/);

  return match ? match[0] : null;
}

/**
 * Parses the timetable sheet
 *
 * output: timetableData = [
 *   {
 *     room: "Veterinerlik VT 1 D03",
 *     capacity: 38,
 *     day: "CUMA",
 *     time: "10:30-11:30",
 *     courseCodes: ["SWE395"],
 *     departments: ["SWE"],
 *     cellText: "SWE395 JBIDOKO"
 *   },
 *   ...
 * ]
 */
function parseTimetableSheet(sheet) {
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  if (!rows || rows.length === 0) return [];

  // Find the row containing "SALON" (the row with day headers).
  const headerIndex = rows.findIndex(
    (row) => row && String(row[0]).toUpperCase().includes("SALON")
  );
  if (headerIndex === -1 || headerIndex + 1 >= rows.length) {
    console.warn("Timetable: SALON header not found");
    return [];
  }

  const dayRow = rows[headerIndex]; // SALON, KAPASİTE, ..., PAZARTESİ (MONDAY) ...
  const timeRow = rows[headerIndex + 1]; //   ,       ,      ,      ,     8:30-09:30 ...

  // Which column corresponds to which (day, time) combination
  const columnMeta = {}; // colIndex -> { day, time }

  for (let col = 0; col < dayRow.length; col++) {
    const dayCell = dayRow[col];
    const timeCell = timeRow[col];

    if (!dayCell || !timeCell) continue;
    if (col < 4) continue; // 0: SALON, 1: KAPASİTE, 2-3: TAHTA/PROJEKSİYON

    if (typeof dayCell !== "string" || typeof timeCell !== "string") continue;

    const dayName = dayCell.split("(")[0].trim(); // "PAZARTESİ     (MONDAY)" -> "PAZARTESİ"
    const timeSlot = timeCell.trim(); // "8:30-09:30"

    if (!dayName || !timeSlot) continue;

    columnMeta[col] = {
      day: dayName.toUpperCase(),
      time: timeSlot,
    };
  }

  /*   columnMeta{
    4: {
      day: 'PAZARTESİ',
      time: 8:30-09:30,
    },
    5: {
      day: 'PAZARTESİ',
      time: 9:30-10:30,
    },
  } */

  const timetableData = [];

  // Actual data starts from headerIndex + 2 (classroom rows)
  for (let i = headerIndex + 2; i < rows.length; i++) {
    const row = rows[i]; /* ["A101", 40, .., "SWE395 POLAWALE", ...] */
    if (!row) continue;

    const roomName = row[0];
    const capacityRaw = row[1];

    if (!roomName || !capacityRaw) continue;

    const capacity = Number(capacityRaw) || 0;
    if (!capacity) continue;

    // For each column, check which course(s) are scheduled at that day/time
    for (const [colStr, meta] of Object.entries(columnMeta)) {
      const col = Number(colStr);
      const cell = row[col]; /* SWE395 POLAWALE */
      if (!cell || typeof cell !== "string") continue;

      const cellText = cell.trim();
      if (!cellText) continue;

      const courseCodes = extractCourseCodesFromCellText(cellText);
      if (courseCodes.length === 0) continue;

      // Extract departments from the course codes in the cell
      const deptSet = new Set();
      for (const code of courseCodes) {
        const dept = departmentFromCode(code);
        if (dept) deptSet.add(dept);
      }
      const departments = Array.from(deptSet);
      if (departments.length === 0) continue;

      timetableData.push({
        room: String(roomName).trim(),
        capacity,
        day: meta.day,
        time: meta.time,
        courseCodes,
        departments,
        cellText,
      });
    }
  }

  return timetableData;
}

module.exports = { parseTimetableSheet };
