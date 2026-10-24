import { useCallback, useRef, useState } from "react";
import { unzipFile } from "./lib/unzip.js";

import { runOCRProgress } from "./lib/ocr.js";
import UploadView from "./components/UploadView.jsx";
import ReaderView from "./components/ReaderView.jsx";

export default function App() {
  const [pages, setPages] = useState([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [langOverride, setLangOverride] = useState("auto");
  const [regions, setRegions] = useState([]);
  const [translations, setTranslations] = useState([]);
  const [ocrStatus, setOcrStatus] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);

  const imgRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    try {
      if (!/\.(cbz|zip)$/i.test(file.name)) {
        throw new Error("Please select a .cbz or .zip file");
      }
      const images = await unzipFile(file);
      if (images.length === 0) {
        throw new Error("No images found inside the archive");
      }
      setPages(images);
      setFileName(file.name);
      setCurrentIndex(0);
      setRegions([]);
      setTranslations([]);
      setSelectedRegion(null);
    } catch (e) {
      setError(e.message || "Failed to read file");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    pages.forEach((p) => URL.revokeObjectURL(p.url));
    setPages([]);
    setFileName("");
    setRegions([]);
    setTranslations([]);
    setSelectedRegion(null);
    setOcrStatus(null);
  }, [pages]);

  const doOCR = useCallback(
    async (imgUrl, idx) => {
      setOcrStatus({ phase: "ocr", progress: 0 });
      setRegions([]);
      setTranslations([]);
      setSelectedRegion(null);
      try {
        const lang = langOverride === "auto" ? "jpn" : langOverride;

        const words = await runOCRProgress(imgUrl, lang, (status, p) =>
          setOcrStatus({ phase: "ocr", status, progress: p })
        );

        const vertical = lang === "jpn_vert";
        const groups = vertical ? groupWordsVertical(words) : groupWords(words);
        setRegions(groups);

        setOcrStatus({ phase: "translating", progress: 0 });
        const results = [];
        for (let i = 0; i < groups.length; i++) {
          try {
            const res = await fetch(
              "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=auto&tl=en&q=" +
                encodeURIComponent(cleanCJK(groups[i].text))
            );
            const data = await res.json();
            const translated = Array.isArray(data) && data[0]
              ? data[0].map((s) => s[0]).join("")
              : "";
            results.push(translated);
          } catch {
            results.push("[translation error]");
          }
          setOcrStatus({
            phase: "translating",
            progress: (i + 1) / groups.length,
          });
        }
        setTranslations(results);
        setOcrStatus(null);
      } catch (e) {
        setOcrStatus(null);
        setError("OCR failed: " + (e.message || "unknown error"));
      }
    },
    [langOverride]
  );

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);
  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(pages.length - 1, i + 1));
  }, [pages.length]);

  if (pages.length === 0) {
    return (
      <UploadView
        onFile={handleFile}
        loading={loading}
        error={error}
        langOverride={langOverride}
        setLangOverride={setLangOverride}
      />
    );
  }

  return (
    <ReaderView
      pages={pages}
      fileName={fileName}
      currentIndex={currentIndex}
      onPrev={goPrev}
      onNext={goNext}
      onReset={reset}
      onOCR={() => doOCR(pages[currentIndex].url, currentIndex)}
      regions={regions}
      translations={translations}
      ocrStatus={ocrStatus}
      selectedRegion={selectedRegion}
      setSelectedRegion={setSelectedRegion}
      langOverride={langOverride}
      setLangOverride={setLangOverride}
      error={error}
    />
  );
}

function groupWords(words) {
  if (words.length === 0) return [];
  const sorted = [...words].sort((a, b) => {
    if (Math.abs(a.bbox.y0 - b.bbox.y0) > 15) return a.bbox.y0 - b.bbox.y0;
    return a.bbox.x0 - b.bbox.x0;
  });

  const groups = [];
  let current = null;

  for (const word of sorted) {
    if (!current) {
      current = {
        words: [word],
        text: word.text,
        bbox: { ...word.bbox },
      };
      continue;
    }
    const yOverlap =
      Math.min(current.bbox.y1, word.bbox.y1) -
      Math.max(current.bbox.y0, word.bbox.y0);
    const yRange = Math.max(current.bbox.y1 - current.bbox.y0, word.bbox.y1 - word.bbox.y0);
    const sameRow = yOverlap > yRange * 0.4;
    const xGap = word.bbox.x0 - current.bbox.x1;

    if (sameRow && xGap < 80) {
      current.words.push(word);
      current.text += " " + word.text;
      current.bbox.x1 = Math.max(current.bbox.x1, word.bbox.x1);
      current.bbox.y0 = Math.min(current.bbox.y0, word.bbox.y0);
      current.bbox.y1 = Math.max(current.bbox.y1, word.bbox.y1);
    } else {
      groups.push(current);
      current = {
        words: [word],
        text: word.text,
        bbox: { ...word.bbox },
      };
    }
  }
  if (current) groups.push(current);

  return groups.map((g) => ({
    text: g.text,
    bbox: g.bbox,
  }));
}

// Tesseract inserts spaces between CJK characters; remove them before translating.
function cleanCJK(text) {
  const cjk = "\\u3040-\\u30ff\\u4e00-\\u9fff\\uac00-\\ud7af\\uff00-\\uffef\\u3000-\\u303f";
  return text.replace(new RegExp("(?<=[" + cjk + "])\\s+(?=[" + cjk + "])", "g"), "");
}

// Vertical manga text: columns read right-to-left, characters top-to-bottom.
function groupWordsVertical(words) {
  if (words.length === 0) return [];
  const sorted = [...words].sort((a, b) => {
    const acx = (a.bbox.x0 + a.bbox.x1) / 2;
    const bcx = (b.bbox.x0 + b.bbox.x1) / 2;
    if (Math.abs(acx - bcx) > 15) return bcx - acx; // right column first
    return a.bbox.y0 - b.bbox.y0;
  });

  const groups = [];
  let current = null;
  const startGroup = (w) => ({ text: w.text, bbox: { ...w.bbox } });

  for (const word of sorted) {
    if (!current) {
      current = startGroup(word);
      continue;
    }
    const xOverlap =
      Math.min(current.bbox.x1, word.bbox.x1) -
      Math.max(current.bbox.x0, word.bbox.x0);
    const xRange = Math.max(
      current.bbox.x1 - current.bbox.x0,
      word.bbox.x1 - word.bbox.x0
    );
    const sameColumn = xOverlap > xRange * 0.4;
    const yGap = word.bbox.y0 - current.bbox.y1;

    if (sameColumn && yGap < 80) {
      current.text += word.text;
      current.bbox.x0 = Math.min(current.bbox.x0, word.bbox.x0);
      current.bbox.x1 = Math.max(current.bbox.x1, word.bbox.x1);
      current.bbox.y1 = Math.max(current.bbox.y1, word.bbox.y1);
    } else {
      groups.push(current);
      current = startGroup(word);
    }
  }
  if (current) groups.push(current);
  return groups;
}
