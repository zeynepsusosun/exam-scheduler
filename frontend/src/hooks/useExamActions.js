import { useExamContext } from "../context/ExamContext";
import { toast } from "react-toastify";
import {
  SET_FILES,
  SET_SUGGESTIONS,
  SET_FINAL_SCHEDULE,
  SET_LOADING,
  SET_ERROR,
} from "../context/examActions";

const API_URL = "http://localhost:5001";

export const useExamActions = () => {
  const { state, dispatch } = useExamContext();

  const startAsync = () => {
    dispatch({ type: SET_LOADING, payload: true });
    dispatch({ type: SET_ERROR, payload: null });
  };

  const uploadFile = async (endpoint, file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      body: formData,
    });

    return res.json();
  };

  const setFiles = ({ timetableFile, examsFile }) => {
    dispatch({
      type: SET_FILES,
      payload: { timetableFile, examsFile },
    });
  };

  const handleUpload = async () => {
    const { timetableFile, examsFile } = state;

    if (!timetableFile || !examsFile) {
      dispatch({
        type: SET_ERROR,
        payload: "Please select both Excel files",
      });
      return;
    }

    startAsync();

    try {
      const timetableRes = await uploadFile(
        "/api/upload/timetable",
        timetableFile
      );
      if (!timetableRes.ok) {
        throw new Error("The timetable file could not be uploaded.");
      }

      const examsRes = await uploadFile("/api/upload/exams", examsFile);
      if (!examsRes.ok) {
        throw new Error("The exams file could not be uploaded.");
      }

      await fetchSuggestions();
    } catch (err) {
      dispatch({
        type: SET_ERROR,
        payload: err.message || "Unexpected error",
      });
    } finally {
      dispatch({ type: SET_LOADING, payload: false });
    }
  };

  const fetchSuggestions = async () => {
    startAsync();

    try {
      const res = await fetch(`${API_URL}/api/suggestions`);
      const data = await res.json();

      if (!data.ok) {
        dispatch({
          type: SET_ERROR,
          payload: data.message || "Suggestions could not be retrieved.",
        });
        return;
      }

      dispatch({
        type: SET_SUGGESTIONS,
        payload: data.suggestions,
      });
    } catch (err) {
      dispatch({
        type: SET_ERROR,
        payload: err.message || "Unexpected error",
      });
    } finally {
      dispatch({ type: SET_LOADING, payload: false });
    }
  };

  const fetchFinalSchedule = async () => {
    const res = await fetch(`${API_URL}/api/final-schedule`);
    const data = await res.json();

    if (data.ok) {
      dispatch({
        type: SET_FINAL_SCHEDULE,
        payload: data.finalSchedule,
      });
    }
  };

  const handleSelectSlot = async (courseCode, slot) => {
    startAsync();

    try {
      const res = await fetch(`${API_URL}/api/select-slot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode,
          day: slot.day,
          time: slot.time,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        dispatch({
          type: SET_ERROR,
          payload: data.message || "Selection could not be made",
        });
        return;
      }

      await fetchFinalSchedule();
      await fetchSuggestions();

      toast.success("Exam successfully added to the final schedule");
    } catch (err) {
      dispatch({
        type: SET_ERROR,
        payload: err.message || "Unexpected error",
      });
    } finally {
      dispatch({ type: SET_LOADING, payload: false });
    }
  };

  const handleUnselectSlot = async (courseCode) => {
    startAsync();

    try {
      const res = await fetch(`${API_URL}/api/unselect-slot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseCode }),
      });

      const data = await res.json();

      if (!data.ok) {
        dispatch({
          type: SET_ERROR,
          payload: data.message || "Selection could not be removed",
        });
        return;
      }

      await fetchFinalSchedule();
      await fetchSuggestions();

      toast.success("Removed from schedule");
    } catch (err) {
      dispatch({
        type: SET_ERROR,
        payload: err.message || "Unexpected error",
      });
    } finally {
      dispatch({ type: SET_LOADING, payload: false });
    }
  };

  return {
    setFiles,
    handleUpload,
    fetchSuggestions,
    fetchFinalSchedule,
    handleSelectSlot,
    handleUnselectSlot,
  };
};
