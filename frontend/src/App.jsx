import { useEffect } from "react";
import FinalScheduleSection from "./components/FinalScheduleSection";
import SuggestionsSection from "./components/SuggestionsSection";
import UploadSection from "./components/UploadSection";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useExamContext } from "./context/ExamContext";

function App() {
  const { state } = useExamContext();
  const { error } = state;

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  return (
    <>
      <div className="app-container">
        <header className="app-header">
          <h1 className="app-title">ENG / AII Exam Scheduler</h1>
        </header>

        <main className="app-content">
          <UploadSection />
          <SuggestionsSection />
        </main>
      </div>

      <ToastContainer
        position="top-center"
        autoClose={3000}
        className="toast-container"
      />
    </>
  );
}

export default App;
