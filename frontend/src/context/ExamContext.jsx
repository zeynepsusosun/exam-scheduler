import React, { createContext, useContext, useReducer } from "react";
import examReducer from "./examReducer";

const ExamContext = createContext();

export const useExamContext = () => useContext(ExamContext);

const defaultState = {
  timetableFile: null,
  examsFile: null,
  suggestions: [],
  finalSchedule: [],
  loading: false,
  error: null,
};

const ExamProvider = ({ children }) => {
  const [state, dispatch] = useReducer(examReducer, defaultState);
  return (
    <ExamContext.Provider value={{ state, dispatch }}>
      {children}
    </ExamContext.Provider>
  );
};

export default ExamProvider;
