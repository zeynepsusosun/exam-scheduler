const DAY_ORDER = [
  "PAZARTESİ",
  "SALI",
  "ÇARŞAMBA",
  "PERŞEMBE",
  "CUMA",
  "CUMARTESİ",
  "PAZAR",
];

const EXAM_DURATION_SLOTS = 2;

function dayOrderIndex(day) {
  const dayIndex = DAY_ORDER.indexOf(String(day || "").toUpperCase());
  return dayIndex === -1 ? 99 : dayIndex;
}

function timeToMinutes(time) {
  if (!time || typeof time !== "string") return 0;

  const timeMatch = time.match(/^(\d{1,2}):(\d{2})/);
  if (!timeMatch) return 0;

  const hours = Number(timeMatch[1]) || 0;
  const minutes = Number(timeMatch[2]) || 0;

  return hours * 60 + minutes;
}

function parseTimeRange(time) {
  const emptyResult = {
    startMin: 0,
    endMin: 0,
    startStr: "",
    endStr: "",
  };

  if (!time || typeof time !== "string") {
    return emptyResult;
  }

  // "09:30 - 10:30"
  const rangeMatch = time.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);

  if (rangeMatch) {
    const startTimeStr = rangeMatch[1];
    const endTimeStr = rangeMatch[2];

    const [startHour, startMinute] = startTimeStr.split(":").map(Number);
    const [endHour, endMinute] = endTimeStr.split(":").map(Number);

    return {
      startMin: (startHour || 0) * 60 + (startMinute || 0),
      endMin: (endHour || 0) * 60 + (endMinute || 0),
      startStr: startTimeStr,
      endStr: endTimeStr,
    };
  }

  // If only the start time is provided like "09:30"
  const startOnlyMatch = time.match(/^(\d{1,2}):(\d{2})/);
  if (!startOnlyMatch) {
    return emptyResult;
  }

  const startHour = Number(startOnlyMatch[1]) || 0;
  const startMinute = Number(startOnlyMatch[2]) || 0;
  const startMin = startHour * 60 + startMinute;

  return {
    startMin,
    endMin: startMin,
    startStr: `${startHour}:${String(startMinute).padStart(2, "0")}`,
    endStr: "",
  };
}

function buildNextTimeMap(timetableData) {
  // day -> Map(time -> { startMin, endMin })
  const timesByDay = {};

  for (const slot of timetableData) {
    const dayKey = String(slot.day || "").toUpperCase();
    const timeStr = slot.time;

    if (!dayKey || !timeStr) continue;

    if (!timesByDay[dayKey]) {
      timesByDay[dayKey] = new Map();
    }

    const timeRange = parseTimeRange(timeStr);
    if (!timeRange.startStr || !timeRange.endStr) continue;

    if (!timesByDay[dayKey].has(timeStr)) {
      timesByDay[dayKey].set(timeStr, {
        startMin: timeRange.startMin,
        endMin: timeRange.endMin,
      });
    }
  }

  // day -> { time -> nextTime }
  const nextTimeMap = {};

  for (const [dayKey, timeRangeMap] of Object.entries(timesByDay)) {
    const sortedSlots = Array.from(timeRangeMap.entries())
      .map(([time, range]) => ({ time, ...range }))
      .sort((a, b) => a.startMin - b.startMin);

    nextTimeMap[dayKey] = {};

    for (let i = 0; i < sortedSlots.length - 1; i++) {
      const currentSlot = sortedSlots[i];
      const nextSlot = sortedSlots[i + 1];

      if (currentSlot.endMin === nextSlot.startMin) {
        nextTimeMap[dayKey][currentSlot.time] = nextSlot.time;
      }
    }
  }

  return nextTimeMap;
}

function expandToSingleSlots(day, time, nextTimeMap) {
  // Expand a wide range like "08:30-10:30" into 1-hour atomic slots
  const dayKey = String(day || "").toUpperCase();
  const nextTimeByDay = (nextTimeMap && nextTimeMap[dayKey]) || {};

  if (!time || typeof time !== "string") return [];

  // If it is already a single slot
  if (
    nextTimeByDay[time] !== undefined ||
    Object.keys(nextTimeByDay).includes(time) ||
    Object.values(nextTimeByDay).includes(time)
  ) {
    return [time];
  }

  const targetRange = parseTimeRange(time);
  if (!targetRange.startStr || !targetRange.endStr) return [];

  // All single slots within the day
  const availableSlots = Array.from(
    new Set([...Object.keys(nextTimeByDay), ...Object.values(nextTimeByDay)])
  );

  const startSlot = availableSlots.find(
    (t) => parseTimeRange(t).startStr === targetRange.startStr
  );
  if (!startSlot) return [];

  const hourlySlots = [];
  let currentSlot = startSlot;
  let safetyCounter = 0;

  while (currentSlot && safetyCounter < 24) {
    safetyCounter++;
    hourlySlots.push(currentSlot);

    const currentEnd = parseTimeRange(currentSlot).endStr;
    if (currentEnd === targetRange.endStr) break;

    currentSlot = nextTimeByDay[currentSlot];
  }

  const lastEnd = parseTimeRange(
    hourlySlots[hourlySlots.length - 1] || ""
  ).endStr;

  if (lastEnd !== targetRange.endStr) return [];

  return hourlySlots;
}

function toDisplayTimeFromSlots(singleSlots) {
  if (!singleSlots || singleSlots.length === 0) return "";

  if (singleSlots.length === 1) {
    return singleSlots[0];
  }

  const firstRange = parseTimeRange(singleSlots[0]);
  const lastRange = parseTimeRange(singleSlots[singleSlots.length - 1]);

  if (!firstRange.startStr || !lastRange.endStr) {
    return singleSlots[0];
  }

  return `${firstRange.startStr}-${lastRange.endStr}`;
}

// extract the departments information from an exam object.
function getExamDepartments(exam) {
  if (exam && Array.isArray(exam.departments) && exam.departments.length > 0) {
    return exam.departments;
  }

  if (exam && exam.departmentCode) {
    return [String(exam.departmentCode).toUpperCase()];
  }

  if (exam && Array.isArray(exam.courseCodes)) {
    const departmentSet = new Set();

    for (const courseCode of exam.courseCodes) {
      const match = String(courseCode)
        .toUpperCase()
        .match(/^[A-ZÇĞİÖŞÜ]{3}/);

      if (match) {
        departmentSet.add(match[0]);
      }
    }

    return Array.from(departmentSet);
  }

  return [];
}

/**
 * Timetable -> Department-based slot index
 *
 * deptSlotIndex = {
 *   SWE: {
 *     "CUMA__10:30-11:30": {
 *       day: "CUMA",
 *       time: "10:30-11:30",
 *       rooms: [{ room, capacity }, ...],
 *       totalCapacity: ...
 *     },
 *     ...
 *   },
 */
function buildDeptSlotIndex(timetableData) {
  const deptSlotIndex = {};

  for (const slot of timetableData) {
    const { day, time, room, capacity, departments } = slot;
    if (!day || !time || !room || !capacity) continue;
    if (!Array.isArray(departments) || departments.length === 0) continue;

    const dayKey = String(day).toUpperCase();
    const slotKey = `${dayKey}__${time}`;

    for (const deptCodeRaw of departments) {
      const deptCode = String(deptCodeRaw).toUpperCase();

      if (!deptSlotIndex[deptCode]) {
        deptSlotIndex[deptCode] = {};
      }

      if (!deptSlotIndex[deptCode][slotKey]) {
        deptSlotIndex[deptCode][slotKey] = {
          day: dayKey,
          time,
          rooms: [],
          totalCapacity: 0,
        };
      }

      deptSlotIndex[deptCode][slotKey].rooms.push({
        room,
        capacity,
      });

      deptSlotIndex[deptCode][slotKey].totalCapacity += capacity;
    }
  }

  return deptSlotIndex;
}

/**
 * Extracts from finalSchedule:
 *  - which classroom is occupied at which day/time
 *  - which department has an exam at which day/time
 */
function buildOccupancy(finalSchedule, nextTimeMap) {
  const occupiedRooms = new Set();
  // örn: "PAZARTESİ__08:30-09:30__D101"

  const deptBusySlots = {};
  // örn: { SWE: Set(["PAZARTESİ__08:30-09:30"]), ... }

  for (const exam of finalSchedule) {
    const dayKey = String(exam.day || "").toUpperCase();

    const singleSlots = expandToSingleSlots(dayKey, exam.time, nextTimeMap);

    for (const singleSlot of singleSlots) {
      const slotKey = `${dayKey}__${singleSlot}`;

      // Classrooms occupied in the relevant slot
      if (Array.isArray(exam.rooms)) {
        for (const roomInfo of exam.rooms) {
          occupiedRooms.add(`${slotKey}__${roomInfo.room}`);
        }
      }

      // Departments busy in the relevant slot
      const departments = getExamDepartments(exam);
      for (const dept of departments) {
        const deptCode = String(dept).toUpperCase();
        if (!deptBusySlots[deptCode]) {
          deptBusySlots[deptCode] = new Set();
        }
        deptBusySlots[deptCode].add(slotKey);
      }
    }
  }

  return { occupiedRooms, deptBusySlots };
}

// Calculates all classrooms that can be used for an exam at the same day and time.
function collectCandidateSlotsForExam(
  departments,
  deptSlotIndex,
  occupiedRooms,
  deptBusySlots,
  nextTimeMap,
  durationSlots = EXAM_DURATION_SLOTS
) {
  const candidates = {};

  for (const deptRaw of departments) {
    const deptCode = String(deptRaw).toUpperCase();
    const slotsForDept = deptSlotIndex[deptCode];
    if (!slotsForDept) continue;

    for (const [startSlotKey] of Object.entries(slotsForDept)) {
      const [dayKey, startTime] = startSlotKey.split("__");
      const nextSlotMap = (nextTimeMap && nextTimeMap[dayKey]) || {};

      // The helper function(collectCandidateSlotsForExam) leverages closure to keep the code clean and free of duplication.
      function tryAddCandidate(singleSlots) {
        // Department conflict check
        for (const dept2 of departments) {
          const deptKey2 = String(dept2).toUpperCase();
          for (const singleSlot of singleSlots) {
            const busyKey = `${dayKey}__${singleSlot}`;
            if (deptBusySlots[deptKey2]?.has(busyKey)) return false;
          }
        }

        // Room availability + continuity
        const roomMapsPerSlot = singleSlots.map((singleSlot) => {
          const slotKey = `${dayKey}__${singleSlot}`;
          const slotInfo = slotsForDept[slotKey];
          const roomCapacityMap = new Map();

          if (!slotInfo || !Array.isArray(slotInfo.rooms)) {
            return roomCapacityMap;
          }

          for (const roomInfo of slotInfo.rooms) {
            const occupiedKey = `${slotKey}__${roomInfo.room}`;
            if (occupiedRooms.has(occupiedKey)) continue;

            roomCapacityMap.set(
              roomInfo.room,
              Math.max(
                roomCapacityMap.get(roomInfo.room) || 0,
                roomInfo.capacity
              )
            );
          }

          return roomCapacityMap;
        });

        if (roomMapsPerSlot.some((m) => m.size === 0)) return false;

        let commonRooms = new Map(roomMapsPerSlot[0]);

        for (let i = 1; i < roomMapsPerSlot.length; i++) {
          const nextRoomMap = roomMapsPerSlot[i];
          for (const room of Array.from(commonRooms.keys())) {
            if (!nextRoomMap.has(room)) {
              commonRooms.delete(room);
            } else {
              commonRooms.set(
                room,
                Math.max(commonRooms.get(room), nextRoomMap.get(room))
              );
            }
          }
        }

        if (commonRooms.size === 0) return false;

        // Add the candidate
        const displayTime = toDisplayTimeFromSlots(singleSlots);
        const candidateKey = `${dayKey}__${displayTime}`;

        if (!candidates[candidateKey]) {
          candidates[candidateKey] = {
            day: dayKey,
            time: displayTime,
            singleSlots,
            rooms: [],
          };
        }

        candidates[candidateKey].rooms.push(
          ...Array.from(commonRooms.entries()).map(([room, capacity]) => ({
            room,
            capacity,
          }))
        );

        return true;
      }

      // Try multi-hour (2-hour) first
      const singleSlotWindow = [startTime];
      let currentSlot = startTime;

      for (let i = 1; i < durationSlots; i++) {
        const nextSlot = nextSlotMap[currentSlot];
        if (!nextSlot) break;
        singleSlotWindow.push(nextSlot);
        currentSlot = nextSlot;
      }

      let added = false;

      if (singleSlotWindow.length === durationSlots) {
        added = tryAddCandidate(singleSlotWindow);
      }

      // If not possible, try a single slot
      if (!added) {
        tryAddCandidate([startTime]);
      }
    }
  }

  // Merge identical rooms (dedupe)
  for (const candidate of Object.values(candidates)) {
    const uniqueRooms = new Map();

    for (const roomInfo of candidate.rooms) {
      if (!uniqueRooms.has(roomInfo.room)) {
        uniqueRooms.set(roomInfo.room, roomInfo.capacity);
      } else {
        uniqueRooms.set(
          roomInfo.room,
          Math.max(uniqueRooms.get(roomInfo.room), roomInfo.capacity)
        );
      }
    }

    candidate.rooms = Array.from(uniqueRooms.entries()).map(
      ([room, capacity]) => ({ room, capacity })
    );
  }

  return candidates;
}

/**
 * Generates the suggestions to be displayed to the user.
 *
 * For each exam:
 *  {
 *    exam: {...},
 *    possibleSlots: [
 *      { day, time, rooms: [...], totalCapacity },
 *      ...
 *    ]
 *  }
 */
function buildSuggestions(timetableData, examsData, finalSchedule) {
  const deptSlotIndex = buildDeptSlotIndex(timetableData);
  const nextTimeMap = buildNextTimeMap(timetableData);
  const suggestions = [];

  for (const exam of examsData) {
    const selectedExam = finalSchedule.find(
      (f) => f.courseCode === exam.courseCode
    );

    const isSelected = Boolean(selectedExam);

    const filteredFinalSchedule = isSelected
      ? finalSchedule.filter((f) => f.courseCode !== exam.courseCode)
      : finalSchedule;

    const { occupiedRooms, deptBusySlots } = buildOccupancy(
      filteredFinalSchedule,
      nextTimeMap
    );

    const departments = getExamDepartments(exam);
    if (!departments.length) {
      suggestions.push({
        exam,
        possibleSlots: [],
        reason: "No department code found for this course",
      });
      continue;
    }

    const candidates = collectCandidateSlotsForExam(
      departments,
      deptSlotIndex,
      occupiedRooms,
      deptBusySlots,
      nextTimeMap,
      EXAM_DURATION_SLOTS
    );

    const possibleSlots = [];

    for (const [slotKey, slot] of Object.entries(candidates)) {
      const totalCapacity = slot.rooms.reduce(
        (sum, r) => sum + (r.capacity || 0),
        0
      );

      if (totalCapacity < exam.students) continue;

      possibleSlots.push({
        day: slot.day,
        time: slot.time,
        rooms: slot.rooms,
        totalCapacity,
      });
    }

    possibleSlots.sort((a, b) => {
      const da = dayOrderIndex(a.day) * 24 * 60 + timeToMinutes(a.time);
      const db = dayOrderIndex(b.day) * 24 * 60 + timeToMinutes(b.time);
      return da - db;
    });

    suggestions.push({
      exam,
      possibleSlots,
      isSelected,
      selectedSlot: isSelected
        ? {
            day: selectedExam.day,
            time: selectedExam.time,
          }
        : null,
    });
  }

  return suggestions;
}

/**
 * When the user selects a specific (day, time) slot for an exam,
 * calculates which classrooms will be used for that slot and adds the result to finalSchedule.
 */
function applySelection({
  courseCode,
  day,
  time,
  timetableData,
  examsData,
  finalSchedule,
}) {
  // 1) Find the relevant exam
  const exam = examsData.find((e) => e.courseCode === courseCode);
  if (!exam) {
    return { ok: false, message: "No exam information found for this course" };
  }

  const departments = getExamDepartments(exam);
  if (!departments.length) {
    return { ok: false, message: "No department code found for this course" };
  }

  // 2) Timetable index and occupancy
  const deptSlotIndex = buildDeptSlotIndex(timetableData);
  const nextTimeMap = buildNextTimeMap(timetableData);
  const { occupiedRooms, deptBusySlots } = buildOccupancy(
    finalSchedule,
    nextTimeMap
  );

  const dayKey = String(day).toUpperCase();
  const singleSlots = expandToSingleSlots(dayKey, time, nextTimeMap);
  if (!singleSlots.length) {
    return {
      ok: false,
      message: "The selected time range does not match the timetable slots",
    };
  }

  // Is there an exam for the same department at any time within this day + time range
  for (const dRaw of departments) {
    const d = String(dRaw).toUpperCase();
    for (const t of singleSlots) {
      const singleSlotKey = `${dayKey}__${t}`;
      if (deptBusySlots[d] && deptBusySlots[d].has(singleSlotKey)) {
        return {
          ok: false,
          message:
            "There is another exam for this department at the same day/time (within this range)",
        };
      }
    }
  }

  const selectedSlotKey = `${dayKey}__${time}`;

  // 3) Calculate all candidate slots for this exam, then take the selected slot
  const candidates = collectCandidateSlotsForExam(
    departments,
    deptSlotIndex,
    occupiedRooms,
    deptBusySlots,
    nextTimeMap,
    EXAM_DURATION_SLOTS
  );

  const slot = candidates[selectedSlotKey];
  if (!slot || !slot.rooms || slot.rooms.length === 0) {
    return {
      ok: false,
      message: "No suitable classroom found for this course at this day/time",
    };
  }

  // 4) Select classrooms to fully meet the required capacity (use a single room if sufficient, otherwise multiple rooms at the same day/time)
  const roomsSorted = [...slot.rooms].sort(
    (a, b) => (b.capacity || 0) - (a.capacity || 0)
  );

  let totalCapacity = 0;
  const chosenRooms = [];

  for (const r of roomsSorted) {
    if (totalCapacity >= exam.students) break;
    totalCapacity += r.capacity || 0;
    chosenRooms.push(r);
  }

  if (totalCapacity < exam.students) {
    return {
      ok: false,
      message: "The total capacity for this slot is insufficient",
    };
  }

  // 5) Add to finalSchedule
  finalSchedule.push({
    courseCode: exam.courseCode,
    courseName: exam.courseName,
    departments,
    instructor: exam.instructor,
    students: exam.students,
    day: String(day).toUpperCase(),
    time,
    rooms: chosenRooms,
  });

  return { ok: true };
}

function removeSelection(courseCode, finalSchedule) {
  const index = finalSchedule.findIndex((f) => f.courseCode === courseCode);

  if (index === -1) {
    return { ok: false, message: "This course is not selected yet" };
  }

  finalSchedule.splice(index, 1);
  return { ok: true };
}

module.exports = { buildSuggestions, applySelection, removeSelection };
