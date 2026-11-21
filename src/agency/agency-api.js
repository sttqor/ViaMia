import { supabase } from "../supabase";
import { compressImage } from "./compressImage";

// Запросы кабинета агентства и панели модерации.
// Что кому можно — решает база (supabase/agency.sql: RLS + триггеры agency_guard / tour_guard),
// здесь только удобные обёртки.

const PHOTOS = "tour-photos";
const DOCS = "agency-docs";

function check({ data, error }) {
  if (error) throw error;
  return data;
}

const rand = () => Math.random().toString(36).slice(2, 10);

// ── агентство ──────────────────────────────────────────────────
export async function fetchMyAgency(userId) {
  return check(await supabase.from("agencies").select("*").eq("owner_user_id", userId).maybeSingle());
}

const AGENCY_FIELDS = ["name", "legal_name", "inn", "license_no", "address", "phone", "telegram", "email", "website", "about", "logo_url", "doc_paths"];
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]));

export async function saveAgency(userId, form, existingId) {
  const row = pick(form, AGENCY_FIELDS);
  if (existingId) {
    return check(await supabase.from("agencies").update(row).eq("id", existingId).select().single());
  }
  return check(await supabase.from("agencies").insert({ ...row, owner_user_id: userId }).select().single());
}

// Документы видят только владелец и админ (приватный бакет)
export async function uploadDoc(agencyId, file) {
  const f = await compressImage(file, 2400);
  const ext = (f.name.match(/\.\w+$/) || [".bin"])[0].toLowerCase();
  const path = `${agencyId}/${Date.now()}-${rand()}${ext}`;
  check(await supabase.storage.from(DOCS).upload(path, f, { contentType: f.type }));
  return path;
}

export async function removeDoc(path) {
  check(await supabase.storage.from(DOCS).remove([path]));
}

export async function docUrl(path) {
  const data = check(await supabase.storage.from(DOCS).createSignedUrl(path, 600));
  return data.signedUrl;
}

// Открыть документ в новой вкладке. Окно открываем сразу — после await браузер его заблокирует.
export async function openDoc(path) {
  const w = window.open("", "_blank");
  try {
    const url = await docUrl(path);
    if (w) w.location.href = url;
    else window.location.href = url;
  } catch (err) {
    w?.close();
    console.warn("Документ не открылся", err);
  }
}

// Фото туров и логотип — публичный бакет, путь <agency_id>/…
export async function uploadPhoto(agencyId, file) {
  const f = await compressImage(file);
  const ext = (f.name.match(/\.\w+$/) || [".jpg"])[0].toLowerCase();
  const path = `${agencyId}/${Date.now()}-${rand()}${ext}`;
  check(await supabase.storage.from(PHOTOS).upload(path, f, { contentType: f.type, cacheControl: "31536000" }));
  return supabase.storage.from(PHOTOS).getPublicUrl(path).data.publicUrl;
}

// URL → путь в бакете (для удаления). Чужие ссылки не трогаем.
export async function removePhoto(url) {
  const marker = `/object/public/${PHOTOS}/`;
  const i = url.indexOf(marker);
  if (i < 0) return;
  await supabase.storage.from(PHOTOS).remove([decodeURIComponent(url.slice(i + marker.length))]);
}

// ── туры агентства ─────────────────────────────────────────────
export async function fetchMyTours(agencyId) {
  return check(
    await supabase.from("tours").select("*").eq("agency_id", agencyId).order("updated_at", { ascending: false })
  );
}

const TOUR_FIELDS = ["title", "category", "type", "place", "duration", "price", "langs", "group_size", "meeting", "description", "highlights", "includes", "images", "lat", "lng", "free_cancel", "source_url", "status", "itinerary"];

export async function saveTour(agencyId, form, id) {
  const row = pick(form, TOUR_FIELDS);
  if (id) return check(await supabase.from("tours").update(row).eq("id", id).select().single());
  return check(await supabase.from("tours").insert({ ...row, agency_id: agencyId }).select().single());
}

export async function setMyTourStatus(id, status) {
  return check(await supabase.from("tours").update({ status }).eq("id", id).select().single());
}

// Удаляем тур, потом его фото из хранилища (иначе файлы остаются навсегда).
// Тур с заявками база удалить не даст — тогда фото не трогаем.
export async function deleteTour(row) {
  check(await supabase.from("tours").delete().eq("id", row.id));
  await Promise.all((row.images || []).map((u) => removePhoto(u).catch(() => {})));
}

// ── заявки ─────────────────────────────────────────────────────
export async function fetchAgencyBookings(agencyId) {
  return check(
    await supabase
      .from("booking_requests")
      .select("*, tour:tours(title, images)")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })
      .limit(200)
  );
}

export async function setBookingStatus(id, status) {
  check(await supabase.from("booking_requests").update({ status }).eq("id", id));
}

// подтвердить с деталями для туриста / поправить детали / отклонить с причиной
// (какие переходы статуса можно — решает booking_guard в базе)
export async function updateBooking(id, patch) {
  const row = pick(patch, ["status", "guide_id", "meet_at", "agency_note", "decline_reason"]);
  return check(await supabase.from("booking_requests").update(row).eq("id", id).select("*, tour:tours(title, images)").single());
}

// непрочитанные сообщения туристов по заявкам агентства: { booking_id: число }
export async function fetchUnreadByBooking(agencyId) {
  const rows = check(
    await supabase
      .from("booking_messages")
      .select("booking_id, created_at, booking:booking_requests!inner(agency_id, agency_read_at)")
      .eq("from_agency", false)
      .eq("booking.agency_id", agencyId)
      .order("created_at", { ascending: false })
      .limit(500)
  );
  const out = {};
  for (const r of rows) {
    const seen = r.booking?.agency_read_at;
    if (!seen || r.created_at > seen) out[r.booking_id] = (out[r.booking_id] || 0) + 1;
  }
  return out;
}

// ── гиды ───────────────────────────────────────────────────────
export async function fetchGuides(agencyId) {
  return check(await supabase.from("guides").select("*").eq("agency_id", agencyId).order("created_at"));
}

const GUIDE_FIELDS = ["name", "photo_url", "langs", "phone", "show_phone", "active"];

export async function saveGuide(agencyId, form, id) {
  const row = pick(form, GUIDE_FIELDS);
  if (id) return check(await supabase.from("guides").update(row).eq("id", id).select().single());
  return check(await supabase.from("guides").insert({ ...row, agency_id: agencyId }).select().single());
}

// гида в заявках удалить нельзя без потери истории — база сама обнулит guide_id (on delete set null)
export async function deleteGuide(row) {
  check(await supabase.from("guides").delete().eq("id", row.id));
  if (row.photo_url) await removePhoto(row.photo_url).catch(() => {});
}

// ── админ платформы ────────────────────────────────────────────
export async function fetchIsAdmin() {
  const data = check(await supabase.rpc("is_admin"));
  return Boolean(data);
}

export async function fetchAgencies() {
  return check(await supabase.from("agencies").select("*").order("created_at", { ascending: false }));
}

export async function reviewAgency(id, status, reason) {
  check(
    await supabase
      .from("agencies")
      .update({ status, reject_reason: status === "approved" ? null : reason || null })
      .eq("id", id)
  );
}

export async function fetchToursForReview() {
  return check(
    await supabase
      .from("tours")
      .select("*, agency:agencies(name, status)")
      .not("agency_id", "is", null)
      .order("submitted_at", { ascending: true, nullsFirst: false })
  );
}

export async function reviewTour(id, status, reason) {
  check(
    await supabase
      .from("tours")
      .update({ status, reject_reason: status === "published" ? null : reason || null })
      .eq("id", id)
  );
}
