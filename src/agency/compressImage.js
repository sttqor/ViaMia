// Фото с телефона весят 3–10 МБ. Перед загрузкой уменьшаем до 1600 px по длинной
// стороне и пережимаем в WebP (~200–400 КБ): туристам грузится быстро, место в
// хранилище не кончается. PDF и маленькие картинки отдаём как есть.
const MAX_SIDE = 1600;
const QUALITY = 0.82;

export async function compressImage(file, maxSide = MAX_SIDE) {
  if (!file.type.startsWith("image/") || typeof document === "undefined") return file; // в телефоне сжимает mobile/lib/agency/files.js
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // HEIC/HEIF (фото с айфона, перенесённые на компьютер) браузеры не показывают — такое фото туристы не увидят.
    // iPhone при выборе фото в браузере сам отдаёт JPEG, сюда попадает только «сырой» .heic
    if (/heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name || "")) throw new Error("heic");
    return file;
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 500 * 1024 && file.type !== "image/png") {
    bitmap.close?.();
    return file;
  }
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const toBlob = (type) => new Promise((res) => canvas.toBlob(res, type, QUALITY));
  // старый Safari не умеет WebP и молча отдаёт PNG — тогда JPEG
  let blob = await toBlob("image/webp");
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg");
  if (!blob) return file;
  const ext = blob.type === "image/webp" ? ".webp" : ".jpg";
  return new File([blob], file.name.replace(/\.\w+$/, "") + ext, { type: blob.type });
}
