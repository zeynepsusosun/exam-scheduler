export const groupByInstructor = (suggestions) => {
  const map = {};
  for (const item of suggestions) {
    const instructor = item.exam.instructor || "Unknown Instructor";
    if (!map[instructor]) map[instructor] = [];
    map[instructor].push(item);
  }
  return map;
};
