import { useEffect, useRef, useState } from "react";

export default function ReaderView({
  pages,
  fileName,
  currentIndex,
  onPrev,
  onNext,
  onReset,
  onOCR,
  regions,
  translations,
  ocrStatus,
  selectedRegion,
  setSelectedRegion,
  langOverride,
  setLangOverride,
  error,
}) {
  const imgRef = useRef(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [panelWidth, setPanelWidth] = useState(null);
  const page = pages[currentIndex];

  useEffect(() => {
    setImgSize({ w: 0, h: 0 });
    setRegionsReset();
  }, [currentIndex]);

  const setRegionsReset = () => {
    setSelectedRegion(null);
  };

  const handleImgLoad = () => {
    if (imgRef.current) {
      setImgSize({
        w: imgRef.current.naturalWidth,
        h: imgRef.current.naturalHeight,
      });
    }
  };

  useEffect(() => {
    const update = () => {
      if (imgRef.current) {
        setPanelWidth(imgRef.current.clientWidth);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const scaleX = imgRef.current ? (imgRef.current.clientWidth || 1) / (imgSize.w || 1) : 1;
  const scaleY = imgRef.current ? (imgRef.current.clientHeight || 1) / (imgSize.h || 1) : 1;

  const isBusy = ocrStatus !== null;

  return (
    <div className="reader-container">
      <header className="reader-header">
        <div className="header-left">
          <button className="ghost" onClick={onReset}>
            ← New File
          </button>
          <span className="file-name" title={fileName}>
            {fileName}
          </span>
        </div>
        <div className="header-center">
          <button className="secondary" onClick={onPrev} disabled={currentIndex === 0}>
            ← Prev
          </button>
          <span className="page-counter">
            {currentIndex + 1} / {pages.length}
          </span>
          <button
            className="secondary"
            onClick={onNext}
            disabled={currentIndex === pages.length - 1}
          >
            Next →
          </button>
        </div>
        <div className="header-right">
          <select
            value={langOverride}
            onChange={(e) => setLangOverride(e.target.value)}
            disabled={isBusy}
          >
            <option value="auto">Auto-detect</option>
            <option value="jpn">Japanese (horizontal)</option>
            <option value="jpn_vert">Japanese (vertical manga)</option>
            <option value="chi_sim">Chinese (Simp.)</option>
            <option value="chi_tra">Chinese (Trad.)</option>
            <option value="kor">Korean</option>
          </select>
          <button onClick={onOCR} disabled={isBusy}>
            {isBusy ? "Working…" : "Translate Page"}
          </button>
        </div>
      </header>

      <div className="reader-body">
        <div className="page-panel">
          <div className="page-wrapper">
            <img
              ref={imgRef}
              src={page.url}
              alt={`Page ${currentIndex + 1}`}
              onLoad={handleImgLoad}
              className="page-image"
            />
            {imgSize.w > 0 && regions.length > 0 && (
              <div className="overlay">
                {regions.map((r, i) => {
                  const isSelected = selectedRegion === i;
                  return (
                    <div
                      key={i}
                      className={`region-box ${isSelected ? "selected" : ""}`}
                      style={{
                        left: r.bbox.x0 * scaleX,
                        top: r.bbox.y0 * scaleY,
                        width: (r.bbox.x1 - r.bbox.x0) * scaleX,
                        height: (r.bbox.y1 - r.bbox.y0) * scaleY,
                      }}
                      onClick={() => setSelectedRegion(isSelected ? null : i)}
                    >
                      <span className="region-num">{i + 1}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="translation-panel">
          <div className="translation-header">
            <h2>Translations</h2>
            {ocrStatus && (
              <span className="status-badge">
                {ocrStatus.phase === "ocr"
                  ? ocrStatus.status === "recognizing text" || !ocrStatus.status
                    ? "Reading text…"
                    : "Loading OCR data (first run only)…"
                  : "Translating…"}{" "}
                {Math.round((ocrStatus.progress || 0) * 100)}%
              </span>
            )}
          </div>
          {error && <p className="error-msg">{error}</p>}
          {regions.length === 0 && !ocrStatus && (
            <div className="empty-translation">
              <p>Click "Translate Page" to extract and translate text.</p>
            </div>
          )}
          {ocrStatus && regions.length === 0 && (
            <div className="empty-translation">
              <div className="spinner" />
              <p>
                {ocrStatus.phase === "ocr"
                  ? "Scanning page for text…"
                  : "Translating detected text…"}
              </p>
            </div>
          )}
          {regions.length > 0 && (
            <div className="translation-list">
              {regions.map((r, i) => (
                <div
                  key={i}
                  className={`translation-item ${selectedRegion === i ? "active" : ""}`}
                  onClick={() => setSelectedRegion(selectedRegion === i ? null : i)}
                >
                  <div className="translation-num">{i + 1}</div>
                  <div className="translation-texts">
                    <p className="original-text">{r.text}</p>
                    <p className="english-text">
                      {translations[i] || "…"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
