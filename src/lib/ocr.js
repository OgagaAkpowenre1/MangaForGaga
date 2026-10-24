import { createWorker } from "tesseract.js";

const workers = {};
// Tesseract.js v5 only accepts the logger in createWorker(), not in recognize().
// So we keep one mutable callback and point it at whichever job is running.
let currentProgress = null;

function handleLog(m) {
  if (!currentProgress) return;
  // m.status examples: "loading tesseract core", "loading language traineddata",
  // "initializing api", "recognizing text"
  currentProgress(m.status, m.progress ?? 0);
}

function withTimeout(promise, ms, message) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

async function getWorker(lang) {
  if (workers[lang]) return workers[lang];
  const p = withTimeout(
    createWorker(lang, 1, {
      logger: handleLog,
      errorHandler: (e) => console.error("Tesseract worker error:", e),
    }),
    60000,
    "Timed out downloading OCR engine / language data. Check your connection or ad-blocker."
  );
  try {
    workers[lang] = await p;
  } catch (e) {
    delete workers[lang];
    throw e;
  }
  return workers[lang];
}

export async function runOCR(imageUrl, lang) {
  return runOCRProgress(imageUrl, lang, null);
}

// onProgress(statusText, 0..1)
export async function runOCRProgress(imageUrl, lang, onProgress) {
  currentProgress = onProgress;
  try {
    const worker = await getWorker(lang);
    const { data } = await withTimeout(
      worker.recognize(imageUrl),
      120000,
      "OCR took too long on this page."
    );
    return extractWords(data);
  } finally {
    currentProgress = null;
  }
}

function extractWords(data) {
  if (!data.words) return [];
  return data.words
    .filter((w) => w.text && w.text.trim())
    .map((w) => ({
      text: w.text.trim(),
      bbox: w.bbox,
      confidence: w.confidence,
    }));
}

export async function terminateAll() {
  for (const lang in workers) {
    try {
      await workers[lang].terminate();
    } catch (e) {
      // ignore
    }
    delete workers[lang];
  }
}
