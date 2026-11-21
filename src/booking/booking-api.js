import { supabase } from "../supabase";

// Чат по брони, «поездка» и события (колокольчик). Права — в базе:
// playbooks/booking-notifications/toolbox/01-booking.sql (RLS + триггеры message_fill / booking_guard).

function check({ data, error }) {
  if (error) throw error;
  return data;
}

// ── чат ────────────────────────────────────────────────────────
export async function fetchMessages(bookingId) {
  return check(
    await supabase
      .from("booking_messages")
      .select("id, body, from_agency, created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true })
      .limit(500)
  );
}

// кто пишет (турист или агентство) — решает база по аккаунту
export async function sendMessage(bookingId, body) {
  return check(
    await supabase.from("booking_messages").insert({ booking_id: bookingId, body }).select("id, body, from_agency, created_at").single()
  );
}

export async function markChatRead(bookingId) {
  check(await supabase.rpc("mark_chat_read", { p_booking: bookingId }));
}

// Новые сообщения сразу (Supabase Realtime, видны только разрешённые RLS строки). Возвращает отписку.
export function subscribeMessages(bookingId, onMessage) {
  if (!supabase) return () => {};
  const ch = supabase
    .channel(`chat-${bookingId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "booking_messages", filter: `booking_id=eq.${bookingId}` },
      (p) => onMessage(p.new)
    )
    .subscribe();
  return () => supabase.removeChannel(ch);
}

// ── «поездка» туриста: гид и контакты приходят только после подтверждения ──
export async function fetchTrip(bookingId) {
  return check(await supabase.rpc("my_trip", { p_booking: bookingId }));
}

// ── события (уведомления в приложении) ──────────────────────────
export async function fetchEvents(limit = 50) {
  return check(
    await supabase
      .from("booking_events")
      .select("id, booking_id, kind, payload, created_at, read_at, to_agency")
      .order("created_at", { ascending: false })
      .limit(limit)
  );
}

export async function markEventsRead() {
  check(await supabase.rpc("mark_events_read"));
}

// любое новое событие для этого аккаунта (RLS отдаёт только свои)
export function subscribeEvents(key, onEvent) {
  if (!supabase) return () => {};
  const ch = supabase
    .channel(`events-${key}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "booking_events" }, (p) => onEvent(p.new))
    .subscribe();
  return () => supabase.removeChannel(ch);
}
