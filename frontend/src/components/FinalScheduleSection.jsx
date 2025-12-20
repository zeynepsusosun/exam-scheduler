import React, { useMemo } from "react";
import { useExamContext } from "../context/ExamContext";
import { DAY_MAP } from "../utils/dayMap";
import { exportFinalScheduleToExcel } from "../utils/exportUtils";

// Günlerin sıralaması (Backend'den gelen veri Türkçe ise bu, İngilizce ise keysleri ona göre düzeltiriz)
const DAY_ORDER = {
  "PAZARTESİ": 1,
  "MONDAY": 1,
  "SALI": 2,
  "TUESDAY": 2,
  "ÇARŞAMBA": 3,
  "WEDNESDAY": 3,
  "PERŞEMBE": 4,
  "THURSDAY": 4,
  "CUMA": 5,
  "FRIDAY": 5,
  "CUMARTESİ": 6,
  "SATURDAY": 6,
  "PAZAR": 7,
  "SUNDAY": 7
};

const FinalScheduleSection = () => {
  const { state } = useExamContext();
  const { finalSchedule } = state;

  // Veriyi Gün ve Saate göre sıralayan fonksiyon
  const sortedSchedule = useMemo(() => {
    if (!finalSchedule) return [];

    return [...finalSchedule].sort((a, b) => {
      // 1. Önce GÜNE göre sırala
      // exam.day verisi muhtemelen büyük harfli geliyor, garantilemek için uppercase yapıyoruz.
      const dayA = DAY_ORDER[String(a.day).toUpperCase()] || 99;
      const dayB = DAY_ORDER[String(b.day).toUpperCase()] || 99;

      if (dayA !== dayB) {
        return dayA - dayB;
      }

      // 2. Günler aynıysa SAATE göre sırala
      // Format genelde "09:30 - 10:30" şeklindedir. İlk saati (09:30) alıp karşılaştıracağız.
      const timeToMin = (t) => {
        if (!t) return 0;
        // Sadece başlangıç saatini al (tireden öncesi)
        const startStr = t.split("-")[0].trim(); 
        const [h, m] = startStr.split(":").map(Number);
        return h * 60 + (m || 0);
      };

      return timeToMin(a.time) - timeToMin(b.time);
    });
  }, [finalSchedule]);

  return (
    <section className="final-schedule-page">
      <h2 className="section-title">Final Exam Schedule</h2>

      {!sortedSchedule.length && (
        <p className="empty-text">No exams have been selected yet.</p>
      )}

      {sortedSchedule.length > 0 && (
        <div className="table-wrapper">
          <table className="final-schedule-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Day</th>
                <th>Time</th>
                <th>Classrooms</th>
                <th>Students</th>
              </tr>
            </thead>
            <tbody>
              {/* Haritalamada artık sortedSchedule kullanıyoruz */}
              {sortedSchedule.map((exam, index) => (
                <tr key={`${exam.courseCode}-${index}`}>
                  <td className="course-cell">
                    {exam.courseCode} – {exam.courseName}
                  </td>
                  <td>{DAY_MAP[exam.day] || exam.day}</td>
                  <td>{exam.time}</td>
                  <td>{exam.rooms?.map((r) => r.room).join(", ") || "-"}</td>
                  <td>{exam.students}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {sortedSchedule.length > 0 && (
        <button
          className="btn btn-final"
          // Excel'e de sıralanmış veriyi gönderiyoruz
          onClick={() => exportFinalScheduleToExcel(sortedSchedule, DAY_MAP)}
        >
          Download Excel
        </button>
      )}
    </section>
  );
};

export default FinalScheduleSection;