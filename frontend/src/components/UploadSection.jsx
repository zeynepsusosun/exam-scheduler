import { useRef } from "react";
import { useExamContext } from "../context/ExamContext";
import { useExamActions } from "../hooks/useExamActions";

const UploadSection = () => {
  const { setFiles, handleUpload } = useExamActions();
  const { state } = useExamContext();

  const { timetableFile, examsFile, loading, suggestions } = state;

  const timetableRef = useRef(null);
  const examRef = useRef(null);

  if (suggestions.length > 0) return null;

  return (
    <section className="upload-page">
      <div className="upload-card">
        <h2 className="section-title">Upload Files</h2>
        <div className="form-group">
          <label className="form-label">Classroom Schedule</label>
          <input
            ref={timetableRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(e) =>
              setFiles({
                timetableFile: e.target.files[0] || null,
                examsFile,
              })
            }
          />
          <div
            className={`custom-file ${timetableFile ? "selected" : ""}`}
            onClick={() => timetableRef.current.click()}
          >
            <span className="file-text">
              {timetableFile
                ? timetableFile.name
                : "Select classroom schedule excel file"}
            </span>
            <button type="button" className="btn file-btn">
              Upload
            </button>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Exam List</label>

          <input
            ref={examRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(e) =>
              setFiles({
                timetableFile,
                examsFile: e.target.files[0] || null,
              })
            }
          />
          <div
            className={`custom-file ${examsFile ? "selected" : ""}`}
            onClick={() => examRef.current.click()}
          >
            <span className="file-text">
              {examsFile ? examsFile.name : "Select exam list excel file"}
            </span>
            <button type="button" className="btn file-btn">
              Upload
            </button>
          </div>
        </div>
        <button
          className="btn btn-block"
          onClick={handleUpload}
          disabled={loading}
        >
          {loading ? "Uploading..." : "Continue"}
        </button>
      </div>
    </section>
  );
};

export default UploadSection;
