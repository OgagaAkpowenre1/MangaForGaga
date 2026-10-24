import JSZip from "jszip";

export async function unzipFile(file) {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter(
    (e) => !e.dir && /\.(png|jpe?g|webp|bmp|gif)$/i.test(e.name)
  );
  entries.sort((a, b) => naturalCompare(a.name, b.name));
  const images = [];
  for (const entry of entries) {
    const blob = await entry.async("blob");
    const url = URL.createObjectURL(blob);
    images.push({ name: entry.name, url });
  }
  return images;
}

function naturalCompare(a, b) {
  const ax = [];
  const bx = [];
  a.replace(/(\d+)|(\D+)/g, (_, $1, $2) => {
    ax.push([$1 ? 0 : 1, $1 || $2]);
    return "";
  });
  b.replace(/(\d+)|(\D+)/g, (_, $1, $2) => {
    bx.push([$1 ? 0 : 1, $1 || $2]);
    return "";
  });
  while (ax.length && bx.length) {
    const an = ax.shift();
    const bn = bx.shift();
    const nn = an[0] - bn[0] || (an[1] > bn[1] ? 1 : an[1] < bn[1] ? -1 : 0);
    if (nn) return nn;
  }
  return ax.length - bx.length;
}
