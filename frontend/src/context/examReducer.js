import {
  SET_FILES,
  SET_SUGGESTIONS,
  SET_FINAL_SCHEDULE,
  SET_LOADING,
  SET_ERROR,
} from "./examActions";

const examReducer = (state, action) => {
  if (action.type === SET_LOADING) {
    return {
      ...state,
      loading: action.payload,
    };
  }
  if (action.type === SET_ERROR) {
    return {
      ...state,
      error: action.payload,
    };
  }
  if (action.type === SET_FILES) {
    return {
      ...state,
      timetableFile: action.payload.timetableFile,
      examsFile: action.payload.examsFile,
    };
  }
  if (action.type === SET_SUGGESTIONS) {
    return {
      ...state,
      suggestions: action.payload,
    };
  }
  if (action.type === SET_FINAL_SCHEDULE) {
    return {
      ...state,
      finalSchedule: action.payload,
    };
  }

  throw new Error(`No matching "${action.type}" - action type`);
};

export default examReducer;
