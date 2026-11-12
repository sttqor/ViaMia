import { supabase } from "./supabase";

// Строки из таблиц Supabase → объекты в том же виде, что в data.js.
// Переводы лежат в колонке i18n как {"en": {...}} с теми же именами полей, что в data.js
// (title, group, meeting, …) — их раскладываем в объект, чтобы работал loc().

const LANG_KEY = /^[a-z]{2}$/;
const i18nBlocks = (i18n) =>
  Object.fromEntries(Object.entries(i18n || {}).filter(([k, v]) => LANG_KEY.test(k) && v && typeof v === "object"));

export function tourFromRow(r) {
  return {
    id: r.id,
    agencyId: r.agency_id,
    category: r.category,
    type: r.type,
    title: r.title,
    place: r.place,
    duration: /^\d+$/.test(r.duration) ? Number(r.duration) : r.duration,
    price: Number(r.price),
    rating: Number(r.rating ?? 0),
    reviews: r.reviews ?? 0,
    badge: r.badge,
    lang: r.langs,
    image: r.images?.[0] || "",
    images: r.images || [],
    lat: r.lat,
    lng: r.lng,
    freeCancel: r.free_cancel,
    group: r.group_size,
    meeting: r.meeting,
    description: r.description,
    highlights: r.highlights || [],
    includes: r.includes || [],
    ...i18nBlocks(r.i18n),
  };
}

export function factFromRow(r) {
  return {
    id: r.id,
    title: r.title,
    emoji: r.emoji,
    short: r.short,
    image: r.image,
    tag: r.tag,
    body: r.body || [],
    points: r.points || [],
    linkLabel: r.link_label,
    linkTab: r.link_tab,
    expId: r.exp_id,
    ...i18nBlocks(r.i18n),
  };
}

// Туры и факты из базы. null — база не настроена.
export async function fetchContent() {
  if (!supabase) return null;
  const [tours, facts] = await Promise.all([
    supabase.from("tours").select("*").eq("published", true).order("sort").order("created_at"),
    supabase.from("facts").select("*").eq("published", true).order("sort").order("created_at"),
  ]);
  if (tours.error) throw tours.error;
  if (facts.error) throw facts.error;
  return { tours: tours.data.map(tourFromRow), facts: facts.data.map(factFromRow) };
}

export const isRemoteEnabled = () => Boolean(supabase);

// Заявка на бронь. Сумму и агентство база берёт из тура сама (триггер booking_fill).
// Ответ не читаем: у туриста нет права читать таблицу заявок.
export async function submitBookingRequest(entry, lang) {
  if (!supabase) return { synced: false };
  const { error } = await supabase.from("booking_requests").insert({
    code: entry.code,
    tour_id: entry.exp.id,
    date: entry.date,
    guests: entry.guests,
    name: entry.name,
    contact: entry.contact,
    lang,
  });
  if (error) throw error;
  return { synced: true };
}

export async function cancelBookingRequest(code) {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("cancel_booking", { p_code: code });
  if (error) throw error;
  return Boolean(data);
}
