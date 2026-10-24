export const LANGUAGES = {
  jpn: { label: "Japanese (horizontal)", tessCode: "jpn" },
  jpn_vert: { label: "Japanese (vertical)", tessCode: "jpn_vert" },
  chi_sim: { label: "Chinese (Simplified)", tessCode: "chi_sim" },
  chi_tra: { label: "Chinese (Traditional)", tessCode: "chi_tra" },
  kor: { label: "Korean", tessCode: "kor" },
};

export function detectLanguage(text) {
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return "jpn";
  if (/[\uac00-\ud7af]/.test(text)) return "kor";
  if (/[\u4e00-\u9fff]/.test(text)) return "chi_sim";
  return null;
}

export async function translateText(text) {
  const res = await fetch(
    "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=auto&tl=en&q=" +
      encodeURIComponent(text)
  );
  if (!res.ok) throw new Error("Translation request failed");
  const data = await res.json();
  if (Array.isArray(data) && data[0]) {
    return data[0].map((seg) => seg[0]).join("");
  }
  return "";
}

export async function translateBatch(texts) {
  return Promise.all(texts.map((t) => translateText(t)));
}
