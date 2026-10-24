import { useCallback, useState } from "react";

export default function UploadView({
  onFile,
  loading,
  error,
  langOverride,
  setLangOverride,
}) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  return (
    <div className="upload-container">
      <div className="upload-card">
        <div className="upload-logo">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </div>
        <h1>Manga Translator</h1>
        <p className="subtitle">
          Upload a CBZ or ZIP file, read through the pages, and get instant
          translations from Japanese, Chinese, or Korean to English.
        </p>

        <div className="lang-select-row">
          <label>Source language:</label>
          <select
            value={langOverride}
            onChange={(e) => setLangOverride(e.target.value)}
          >
            <option value="auto">Auto-detect</option>
            <option value="jpn">Japanese</option>
            <option value="chi_sim">Chinese (Simplified)</option>
            <option value="chi_tra">Chinese (Traditional)</option>
            <option value="kor">Korean</option>
          </select>
        </div>

        <div
          className={`dropzone ${dragging ? "dragging" : ""}`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onClick={() => document.getElementById("file-input").click()}
        >
          {loading ? (
            <div className="dropzone-loading">
              <div className="spinner" />
              <span>Extracting images…</span>
            </div>
          ) : (
            <div className="dropzone-idle">
              <p className="dropzone-title">Drop your CBZ / ZIP here</p>
              <p className="dropzone-sub">or click to browse</p>
            </div>
          )}
        </div>
        <input
          id="file-input"
          type="file"
          accept=".cbz,.zip"
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files[0]) onFile(e.target.files[0]);
          }}
        />

        {error && <p className="error-msg">{error}</p>}

        <div className="info-note">
          <strong>How it works:</strong> Upload a comic archive, navigate to a
          page, and hit "Translate". OCR detects text on the page and Google
          Translate converts it to English. The original and translated text
          appear side by side so you can follow along while reading.
        </div>
      </div>
    </div>
  );
}
