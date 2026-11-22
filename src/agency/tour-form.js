import { CITY } from "../data";

// Форма тура агентства ↔ строка таблицы tours. Общая для веба (TourEditor.jsx) и телефона (mobile/src/app/agency/tour/[id].js).

export const MAX_PHOTOS = 8;
export const LANGS = ["RU", "EN", "KY", "UZ", "KK", "TR", "DE", "FR", "ZH"];
const lines = (s) => s.split("\n").map((x) => x.trim()).filter(Boolean);

// программа: строка «10:00 — Сулайман-Тоо» ↔ { time, title }
const planToText = (it) => (it || []).map((p) => (p.time ? `${p.time} — ${p.title}` : p.title)).join("\n");
function textToPlan(text) {
  return lines(text)
    .slice(0, 30)
    .map((l) => {
      const m = /^(\d{1,2})[:.](\d{2})\s*[—–-]?\s*(.+)$/.exec(l);
      return m ? { time: `${m[1].padStart(2, "0")}:${m[2]}`, title: m[3].trim().slice(0, 120) } : { time: "", title: l.slice(0, 120) };
    });
}

export function fromRow(r) {
  return {
    title: r?.title || "",
    category: r?.category || "tours",
    type: r?.type || "",
    place: r?.place || "",
    hours: r?.duration && /^\d+$/.test(r.duration) ? String(Number(r.duration) / 60) : "",
    price: r?.price == null ? "" : String(r.price),
    onRequest: r ? r.price == null : false,
    langs: r?.langs ? r.langs.split(/\s*·\s*/).filter(Boolean) : ["RU"],
    group_size: r?.group_size || "",
    meeting: r?.meeting || "",
    description: r?.description || "",
    highlights: (r?.highlights || []).join("\n"),
    includes: (r?.includes || []).join("\n"),
    plan: planToText(r?.itinerary),
    images: r?.images || [],
    lat: r?.lat ?? CITY.lat,
    lng: r?.lng ?? CITY.lng,
    pointSet: Boolean(r),
    free_cancel: r?.free_cancel ?? true,
    source_url: r?.source_url || "",
  };
}

export function toRow(f, status) {
  const mins = Math.round(parseFloat(String(f.hours).replace(",", ".")) * 60);
  return {
    title: f.title.trim(),
    category: f.category,
    type: f.type.trim() || "—",
    place: f.place.trim() || "Ош",
    duration: Number.isFinite(mins) && mins > 0 ? String(mins) : "60",
    price: f.onRequest || f.price === "" ? null : Math.max(0, Number(String(f.price).replace(",", "."))),
    langs: f.langs.join(" · ") || null,
    group_size: f.group_size.trim() || null,
    meeting: f.meeting.trim() || null,
    description: f.description.trim() || null,
    highlights: lines(f.highlights),
    includes: lines(f.includes),
    itinerary: textToPlan(f.plan),
    images: f.images,
    lat: f.lat,
    lng: f.lng,
    free_cancel: f.free_cancel,
    source_url: f.source_url.trim() || null,
    status,
  };
}

// Что должно быть в туре, чтобы турист понял, за что платит и куда идти.
// Без этого тур не уходит на проверку (черновик сохранить можно всегда).
export function checklist(f) {
  const hours = parseFloat(String(f.hours).replace(",", "."));
  return [
    ["photos", f.images.length >= 3],
    ["title", f.title.trim().length >= 8],
    ["type", f.type.trim().length >= 3 && f.place.trim().length >= 2],
    ["duration", hours > 0 && hours <= 24 * 14],
    ["price", f.onRequest || Number(String(f.price).replace(",", ".")) > 0],
    ["langs", f.langs.length > 0],
    ["description", f.description.trim().length >= 120],
    ["highlights", lines(f.highlights).length >= 3],
    ["includes", lines(f.includes).length >= 1],
    ["meeting", f.meeting.trim().length >= 10 && f.pointSet],
  ];
}
