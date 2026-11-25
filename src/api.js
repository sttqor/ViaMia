import { supabase } from "./supabase";
import { compressImage } from "./agency/compressImage";

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
    price: r.price == null ? null : Number(r.price), // null — цена по запросу
    rating: r.rating == null ? null : Number(r.rating),
    reviews: r.reviews ?? 0,
    // агентство с аккаунтом — имя и метка «проверено» из agencies; туры с сайтов — только agency_name
    agencyName: r.agency?.name || r.agency_name,
    agencyVerified: Boolean(r.agency?.verified),
    agencyLogo: r.agency?.logo_url || null,
    url: r.source_url,
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
    itinerary: r.itinerary || [], // [{ time, title }] — программа по времени
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
    supabase.from("tours").select("*, agency:agencies(name, verified, logo_url)").eq("published", true).order("sort").order("created_at"),
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
  const row = {
    code: entry.code,
    tour_id: entry.exp.id,
    date: entry.date,
    guests: entry.guests,
    name: entry.name,
    contact: entry.contact,
    lang,
  };
  // вошедший турист читает свою заявку — берём id для чата и «поездки»; гостю читать нельзя
  const { data: sess } = await supabase.auth.getSession();
  // 23505 — такой код уже есть: первая попытка дошла, а ответ потерялся (обрыв связи). Это не ошибка
  const DUP = "23505";
  if (sess?.session) {
    const { data, error } = await supabase.from("booking_requests").insert(row).select("id").single();
    if (error?.code === DUP) {
      const { data: had } = await supabase.from("booking_requests").select("id").eq("code", row.code).eq("user_id", sess.session.user.id).maybeSingle();
      if (had) return { synced: true, id: had.id };
    }
    if (error) throw error;
    return { synced: true, id: data.id };
  }
  const { error } = await supabase.from("booking_requests").insert(row);
  if (error && error.code !== DUP) throw error;
  return { synced: true };
}

export async function cancelBookingRequest(code) {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("cancel_booking", { p_code: code });
  if (error) throw error;
  return Boolean(data);
}

// ── Аккаунт: свои брони и профиль ──────────────────────────────
// В базе у заявки только id тура — сам тур берём из каталога.
export function bookingFromRow(r, byId) {
  const exp = byId(r.tour_id);
  if (!exp) return null; // тур сняли с публикации — останется локальная копия брони
  return {
    id: r.id, // для чата и «поездки»
    code: r.code,
    exp,
    date: r.date,
    guests: r.guests,
    total: r.total_usd == null ? null : Number(r.total_usd),
    name: r.name,
    contact: r.contact,
    status: r.status, // агентство подтвердило — увидим здесь
    meetAt: r.meet_at,
    note: r.agency_note,
    declineReason: r.decline_reason,
    createdAt: r.created_at,
    synced: true,
  };
}

// Только свои заявки. Фильтр по user_id обязателен: у владельца агентства
// есть право читать ещё и заявки его агентства, они в билеты туриста не нужны.
export async function fetchMyBookings(userId, byId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((r) => bookingFromRow(r, byId)).filter(Boolean);
}

export async function fetchProfile(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

// Для профиля: есть ли у пользователя агентство и права модерации (входы в кабинет и /admin)
export async function fetchAccountRoles(userId) {
  if (!supabase) return { agency: null, admin: false };
  const [agency, admin] = await Promise.all([
    supabase.from("agencies").select("name, status").eq("owner_user_id", userId).maybeSingle(),
    supabase.rpc("is_admin"),
  ]);
  // сбой сети ≠ «нет агентства»: иначе агентство откроется как турист
  if (agency.error || admin.error) throw agency.error || admin.error;
  return { agency: agency.data || null, admin: Boolean(admin.data) };
}

// Удалить свой аккаунт навсегда (App Store / Google Play требуют). Права проверяет база:
// playbooks/store-release/toolbox/01-delete-account.sql
export async function deleteMyAccount() {
  if (!supabase) throw new Error("offline");
  // фото профиля — до удаления аккаунта: потом прав на свою папку уже не будет
  const { data: sess } = await supabase.auth.getSession();
  if (sess?.session) await clearAvatars(sess.session.user.id).catch(() => {});
  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw error;
}

export async function saveProfile(userId, patch) {
  if (!supabase) return;
  const { error } = await supabase.from("profiles").upsert({ id: userId, ...patch });
  if (error) throw error;
}

// Фото профиля: бакет avatars, папка = id пользователя (playbooks/store-release/toolbox/03-profile-avatar.sql).
// Новое фото — новый файл (иначе телефон покажет старое из кэша); старые удаляются при сохранении профиля.
export async function uploadAvatar(userId, file) {
  const f = await compressImage(file, 512);
  const ext = (f.name.match(/\.\w+$/) || [".jpg"])[0].toLowerCase();
  const path = `${userId}/${Date.now()}${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, f.body || f, { contentType: f.type, cacheControl: "31536000" });
  if (error) throw error;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

// ссылка на наше фото → путь в бакете (чужие ссылки, например фото из Google, → undefined)
export const avatarPath = (url) => (url && url.includes("/avatars/") ? decodeURIComponent(url.split("/avatars/")[1]) : undefined);

// удалить все фото профиля, кроме keep (путь в бакете)
export async function clearAvatars(userId, keep) {
  const { data, error } = await supabase.storage.from("avatars").list(userId);
  if (error) throw error;
  const paths = (data || []).map((o) => `${userId}/${o.name}`).filter((p) => p !== keep);
  if (paths.length) await supabase.storage.from("avatars").remove(paths);
}
