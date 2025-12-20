import * as XLSX from "xlsx";

// Günleri çevirmek için özel harita
const BILINGUAL_DAYS = {
  "MONDAY": "Monday / Pazartesi",
  "TUESDAY": "Tuesday / Salı",
  "WEDNESDAY": "Wednesday / Çarşamba",
  "THURSDAY": "Thursday / Perşembe",
  "FRIDAY": "Friday / Cuma",
  "SATURDAY": "Saturday / Cumartesi",
  "SUNDAY": "Sunday / Pazar",
  "PAZARTESİ": "Monday / Pazartesi",
  "SALI": "Tuesday / Salı",
  "ÇARŞAMBA": "Wednesday / Çarşamba",
  "PERŞEMBE": "Thursday / Perşembe",
  "CUMA": "Friday / Cuma",
  "CUMARTESİ": "Saturday / Cumartesi",
  "PAZAR": "Sunday / Pazar"
};

export const exportFinalScheduleToExcel = (finalSchedule, dayMap) => {
  // 1. Veriyi hem İngilizce hem Türkçe başlıklar ve içeriklerle hazırlıyoruz
  const data = finalSchedule.map((exam) => {
    // Gün verisini büyük harfe çevirip haritamızdan çift dilli karşılığını buluyoruz
    // Eğer bulamazsak orijinal halini (dayMap veya exam.day) yazıyoruz.
    const rawDay = String(exam.day).toUpperCase();
    const displayDay = BILINGUAL_DAYS[rawDay] || dayMap[exam.day] || exam.day;

    return {
      "Course Code / Ders Kodu": exam.courseCode,
      "Course Name / Ders Adı": exam.courseName,
      "Day / Gün": displayDay,
      "Time / Saat": exam.time,
      "Classrooms / Sınıflar": exam.rooms?.map((r) => r.room).join(", ") || "-",
      "Students / Öğrenciler": exam.students,
    };
  });

  // 2. Worksheet (Çalışma Sayfası) oluşturuyoruz
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 3. SÜTUN GENİŞLİKLERİNİ AYARLIYORUZ
  worksheet["!cols"] = [
    { wch: 60 }, // A: Course Code / Ders Kodu
    { wch: 80 }, // B: Course Name / Ders Adı
    { wch: 25 }, // C: Day / Gün (Çift dil olduğu için biraz genişlettik)
    { wch: 20 }, // D: Time / Saat
    { wch: 80 }, // E: Classrooms / Sınıflar
    { wch: 20 }, // F: Students / Öğrenciler
  ];

  // 4. Workbook (Excel Dosyası) oluşturup indiriyoruz
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Final Schedule");
  
  XLSX.writeFile(workbook, "Final_Exam_Schedule.xlsx");
};