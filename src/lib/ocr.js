import { createWorker } from "tesseract.js";

let workers = {};

async function getWorker(lang) {
  if (workers[lang]) return workers[lang];
  const worker = await createWorker(lang, 1, {
    logger: () => {},
  });
  workers[lang] = worker;
  return worker;
}

export async function runOCR(imageUrl, lang) {
  const worker = await getWorker(lang);
  const { data } = await worker.recognize(imageUrl);
  return extractWords(data);
}

export async function runOCRProgress(imageUrl, lang, onProgress) {
  const worker = await getWorker(lang);
  const { data } = await worker.recognize(imageUrl, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(m.progress);
      }
    },
  });
  return extractWords(data);
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
  }
  workers = {};
}
