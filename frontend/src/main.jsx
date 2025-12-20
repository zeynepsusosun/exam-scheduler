import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./App.css";
import App from "./App.jsx";
import ExamProvider from "./context/ExamContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ExamProvider>
      <App />
    </ExamProvider>
  </StrictMode>
);
