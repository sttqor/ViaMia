import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { router } from "expo-router";
import { useSettings } from "../../../src/settings-context";
import { useAuth } from "../../../src/auth-context";
import { fetchEvents, markEventsRead } from "../../../src/booking/booking-api";
import { useStore } from "../../lib/store";
import { Screen } from "../../lib/Screen";
import { FONT, RADIUS, useColors } from "../../lib/theme";

// события по броням — как список в src/booking/EventsBell.jsx; открытие помечает всё прочитанным
export default function EventsScreen() {
  const { t, fmtDate } = useSettings();
  const { user } = useAuth();
  const { bookings } = useStore();
  const c = useColors();
  const [events, setEvents] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchEvents()
      .then((d) => setEvents(d.filter((e) => !e.to_agency)))
      .catch(() => setEvents([]));
    markEventsRead().catch(() => {});
  }, [user]);

  const text = (e) => {
    const p = e.payload || {};
    const date = p.date ? fmtDate(p.date) : "";
    if (e.kind === "message") return t("bell.message", { text: p.text || "" });
    if (e.kind === "declined") return t("bell.declined", { tour: p.tour || "", date }) + (p.reason ? ` ${t("bell.reason", { reason: p.reason })}` : "");
    return t(`bell.${e.kind}`, { tour: p.tour || "", date });
  };
  const open = (bookingId) => {
    const b = bookings.find((x) => x.id === bookingId);
    if (b) router.push(`/ticket/${b.code}`);
  };

  return (
    <Screen title={t("bell.title")}>
      {events?.length === 0 && <Text style={{ fontFamily: FONT.ui, color: c.muted, textAlign: "center", paddingVertical: 24 }}>{t("bell.empty")}</Text>}
      {events?.map((e) => (
        <Pressable key={e.id} onPress={() => open(e.booking_id)} style={{ padding: 14, gap: 4, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
          <Text style={{ fontFamily: e.read_at ? FONT.ui : FONT.bold, fontSize: 14, lineHeight: 20, color: c.ink }}>{text(e)}</Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: c.muted }}>{fmtDate(new Date(e.created_at).toLocaleDateString("en-CA"))}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}
