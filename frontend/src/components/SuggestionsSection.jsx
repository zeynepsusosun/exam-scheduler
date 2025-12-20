import React, { useState } from "react";
import { useExamContext } from "../context/ExamContext";
import { useExamActions } from "../hooks/useExamActions";
import FinalScheduleSection from "./FinalScheduleSection";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { DAY_MAP } from "../utils/dayMap";
import { groupByInstructor } from "../utils/groupByInstructor";

const SuggestionsSection = () => {
  const { state } = useExamContext();
  const { suggestions } = state;
  const { handleSelectSlot, handleUnselectSlot } = useExamActions();
  const grouped = groupByInstructor(suggestions);
  const [openInstructor, setOpenInstructor] = useState(null);
  const [openExam, setOpenExam] = useState(null);
  const [activeDayForExam, setActiveDayForExam] = useState({});
  const [isFinalSchedule, setIsFinalSchedule] = useState(false);

  if (isFinalSchedule) {
    return <FinalScheduleSection />;
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <section className="suggestions-page">
      <div className="instructor-grid">
        {Object.entries(grouped).map(([instructor, exams]) => {
          const isInstructorOpen = openInstructor === instructor;

          return (
            <div className="instructor-card" key={instructor}>
              {/* ===== INSTRUCTOR HEADER ===== */}
              <div
                className="instructor-header"
                onClick={() =>
                  setOpenInstructor(isInstructorOpen ? null : instructor)
                }
              >
                <span className="instructor-name">{instructor}</span>
                <span
                  className={`chevron ${
                    isInstructorOpen ? "chevron-open" : ""
                  }`}
                >
                  <FaChevronDown />
                </span>
              </div>

              {/* ===== EXAMS ===== */}
              {isInstructorOpen && (
                <div className="instructor-body">
                  <div className="exam-scroll">
                    {exams.map(
                      ({
                        exam,
                        possibleSlots,
                        isSelected,
                        selectedSlot,
                        reason,
                      }) => {
                        const isExamOpen = openExam === exam.courseCode;

                        const days = [
                          ...new Set(possibleSlots.map((s) => s.day)),
                        ];

                        const currentDay =
                          activeDayForExam[exam.courseCode] || days[0];

                        return (
                          <div className="exam-card" key={exam.courseCode}>
                            {/* ===== EXAM HEADER ===== */}
                            <div
                              className="exam-header"
                              onClick={() =>
                                setOpenExam(isExamOpen ? null : exam.courseCode)
                              }
                            >
                              <span className="exam-title">
                                {exam.courseCode} – {exam.courseName} (
                                {exam.students})
                              </span>
                              <span className="chevron">
                                {isExamOpen ? (
                                  <FaChevronUp />
                                ) : (
                                  <FaChevronDown />
                                )}
                              </span>
                            </div>

                            {reason && (
                              <div className="error-text">{reason}</div>
                            )}

                            {/* ===== EXAM BODY ===== */}
                            {isExamOpen && (
                              <div className="exam-body">
                                {isSelected && selectedSlot && (
                                  <div className="selected-slot-box">
                                    <div className="selected-slot-text">
                                      <strong>Selected:</strong>{" "}
                                      {DAY_MAP[selectedSlot.day] ||
                                        selectedSlot.day}{" "}
                                      – {selectedSlot.time}
                                    </div>

                                    <button
                                      className="btn-remove btn-sm"
                                      onClick={() =>
                                        handleUnselectSlot(exam.courseCode)
                                      }
                                    >
                                      Remove
                                    </button>
                                  </div>
                                )}

                                {!isSelected && possibleSlots.length > 0 && (
                                  <>
                                    {/* Days */}
                                    <div className="day-tabs">
                                      {days.map((day) => (
                                        <button
                                          key={day}
                                          className={`day-tab ${
                                            currentDay === day ? "active" : ""
                                          }`}
                                          onClick={() =>
                                            setActiveDayForExam((prev) => ({
                                              ...prev,
                                              [exam.courseCode]: day,
                                            }))
                                          }
                                        >
                                          {DAY_MAP[day] || day}
                                        </button>
                                      ))}
                                    </div>

                                    {/* Slots */}
                                    <div className="slot-scroll">
                                      <ul className="slot-list">
                                        {possibleSlots
                                          .filter((s) => s.day === currentDay)
                                          .map((slot, idx) => (
                                            <li className="slot-item" key={idx}>
                                              <span>
                                                {slot.time} | Capacity:{" "}
                                                {slot.totalCapacity}
                                              </span>
                                              <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() =>
                                                  handleSelectSlot(
                                                    exam.courseCode,
                                                    slot
                                                  )
                                                }
                                              >
                                                Select
                                              </button>
                                            </li>
                                          ))}
                                      </ul>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        className="btn btn-final"
        onClick={() => setIsFinalSchedule(true)}
      >
        View Final Schedule
      </button>
    </section>
  );
};

export default SuggestionsSection;
