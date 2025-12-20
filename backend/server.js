const express = require("express");
const cors = require("cors");
const multer = require("multer");
const xlsx = require("xlsx");

const { parseTimetableSheet } = require("./parsers/timetableParser");
const { parseExamsSheet } = require("./parsers/examsParser");
const {
  buildSuggestions,
  applySelection,
  removeSelection,
} = require("./scheduler");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// GLOBAL DATA
let timetableData = [];
let examsData = [];
let finalSchedule = [];

// 1) TIMETABLE UPLOAD
app.post("/api/upload/timetable", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ ok: false, message: "Timetable file is missing" });
    }

    const buffer = req.file.buffer;
    const workbook = xlsx.read(buffer, { type: "buffer" });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    timetableData = parseTimetableSheet(sheet);

    return res.json({ ok: true, count: timetableData.length });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ ok: false, message: "Timetable file could not be parsed" });
  }
});

// 2) EXAM UPLOAD
app.post("/api/upload/exams", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ ok: false, message: "Exams file is missing" });
    }

    const buffer = req.file.buffer;
    const workbook = xlsx.read(buffer, { type: "buffer" });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    examsData = parseExamsSheet(sheet);

    return res.json({ ok: true, count: examsData.length });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ ok: false, message: "Exams file could not be parsed" });
  }
});

// 3) SUGGESTION
app.get("/api/suggestions", (req, res) => {
  try {
    const suggestions = buildSuggestions(
      timetableData,
      examsData,
      finalSchedule
    );
    return res.json({ ok: true, suggestions });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ ok: false, message: "Suggestions could not be calculated" });
  }
});

// 4) SLOT SELECTION
app.post("/api/select-slot", (req, res) => {
  try {
    const { courseCode, day, time } = req.body;
    const response = applySelection({
      courseCode,
      day,
      time,
      timetableData,
      examsData,
      finalSchedule,
    });

    if (!response.ok) {
      return res.status(400).json(response);
    }

    return res.json({ ok: true, finalSchedule });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ ok: false, message: "An error occurred during slot selection" });
  }
});

// 5) FINAL SCHEDULE
app.get("/api/final-schedule", (req, res) => {
  return res.json({ ok: true, finalSchedule });
});

// 5) SLOT REMOVAL
app.post("/api/unselect-slot", (req, res) => {
  try {
    const { courseCode } = req.body;

    const result = removeSelection(courseCode, finalSchedule);

    if (!result.ok) {
      return res.status(400).json(result);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      ok: false,
      message: "An error occurred while removing the slot",
    });
  }
});

// ------------------------------
app.listen(5001, "0.0.0.0", () => {
  console.log("Server started on port 5001");
});
