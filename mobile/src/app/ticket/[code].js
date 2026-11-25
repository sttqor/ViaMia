import { useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Calendar, Check, Clock, MapPin, MessageCircle, Phone, Send, Ticket, User, UserRound, X } from "lucide-react-native";
import { useSettings } from "../../../../src/settings-context";
import { useAuth } from "../../../../src/auth-context";
import { cancelBookingRequest } from "../../../../src/api";
import { fetchTrip } from "../../../../src/booking/booking-api";
import { useStore } from "../../../lib/store";
import { Screen } from "../../../lib/Screen";
import { Button } from "../../../lib/ui";
import { BookingChat } from "../../../lib/BookingChat";
import { FONT, RADIUS, useColors } from "../../../lib/theme";

const TZ = "Asia/Bishkek";
const digits = (p) => (p || "").replace(/[^\d+]/g, "");
const tgLink = (tg) => {
  const v = (tg || "").trim().replace(/^https?:\/\/t\.me\//, "").replace(/^@/, "");
  return v ? `https://t.me/${v}` : null;
};

// билет и «поездка» — как src/views/TicketView.jsx + src/booking/TripBlock.jsx
export default function TicketScreen() {
  const { code } = useLocalSearchParams();
  const { t, loc, money, plural, fmtDate, locale } = useSettings();
  const { user } = useAuth();
  const { bookings, setBookings } = useStore();
  const c = useColors();
  const booking = bookings.find((b) => b.code === code);
  const [trip, setTrip] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(false);
  const canTrip = Boolean(user && booking?.id);

  useEffect(() => {
    if (!canTrip) return;
    let off = false;
    fetchTrip(booking.id).then((d) => !off && setTrip(d)).catch(() => {});
    return () => {
      off = true;
    };
  }, [booking?.id, canTrip, booking?.status]);

  if (!booking) return <Screen title={t("common.nothing")} />;
  const exp = loc(booking.exp);
  const status = trip?.status || booking.status;
  const meetAt = trip?.meet_at || booking.meetAt;
  const note = trip?.note || booking.note;
  const guide = trip?.guide;
  const agency = trip?.agency;
  const plan = booking.exp.itinerary || [];
  const phone = guide?.phone || agency?.phone;
  const tg = tgLink(agency?.telegram);
  const meetLabel = meetAt
    ? new Intl.DateTimeFormat(locale, { timeZone: TZ, weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(meetAt))
    : null;

  async function doCancel() {
    setCancelling(true);
    setCancelError(false);
    try {
      if (booking.synced && !(await cancelBookingRequest(booking.code))) throw new Error("not cancellable");
      setBookings((b) => b.filter((x) => x.code !== booking.code));
      router.back();
    } catch (err) {
      console.warn("Отмена не прошла", err);
      setCancelError(true);
      setCancelling(false);
    }
  }

  const card = { padding: 16, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, gap: 8 };
  const h = { fontFamily: FONT.heavy, fontSize: 16, color: c.ink };
  const line = (Icon, text) => (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Icon color={c.muted} size={15} style={{ marginTop: 2 }} />
      <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 14, lineHeight: 20, color: c.muted }}>{text}</Text>
    </View>
  );
  const pill = (Icon, text, url) => (
    <Pressable key={text} onPress={() => Linking.openURL(url)} style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: RADIUS.chip, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
      <Icon color={c.ink} size={14} />
      <Text style={{ fontFamily: FONT.bold, color: c.ink }}>{text}</Text>
    </Pressable>
  );
  const ok = status === "confirmed" || status === "done";
  const closed = ["declined", "cancelled", "expired", "done"].includes(status);
  const StatusIcon = ok ? Check : closed ? X : Clock;
  const statusText = status === "confirmed" ? t("ticket.confirmed") : closed ? t(`ticket.${status}`) : t("ticket.pending");

  return (
    <Screen title={t("ticket.title")}>
      <View style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, overflow: "hidden" }}>
        <Image source={exp.image} style={{ height: 150, backgroundColor: c.bg2 }} contentFit="cover" />
        <View style={{ padding: 16, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <StatusIcon color={ok ? c.success : c.muted} size={16} />
            <Text style={{ flex: 1, fontFamily: FONT.bold, color: ok ? c.success : c.muted }}>{statusText}</Text>
          </View>
          <Text style={{ fontFamily: FONT.display, fontSize: 22, color: c.ink }}>{exp.title}</Text>
          {line(Calendar, `${fmtDate(booking.date)} · ${plural("pl.guests", booking.guests)}`)}
          {exp.meeting ? line(MapPin, exp.meeting) : null}
          {booking.name ? line(User, `${booking.name} · ${booking.contact}`) : null}
          {line(Ticket, `${t("ticket.payOnSite")} ${booking.total == null ? t("price.request") : money(booking.total)}`)}
        </View>
        <View style={{ borderTopWidth: 1, borderStyle: "dashed", borderColor: c.line, padding: 16, alignItems: "center", gap: 4 }}>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: c.muted }}>{t("ticket.code")}</Text>
          <Text style={{ fontFamily: FONT.heavy, fontSize: 26, letterSpacing: 4, color: c.ink }}>{booking.code}</Text>
        </View>
      </View>

      {status === "declined" && booking.declineReason ? (
        <View style={card}><Text style={{ fontFamily: FONT.ui, color: c.ink }}>{t("bell.reason", { reason: booking.declineReason })}</Text></View>
      ) : null}

      {status === "confirmed" && meetLabel ? (
        <View style={card}>
          <Text style={h}>{t("trip.meet")}</Text>
          <Text style={{ fontFamily: FONT.heavy, fontSize: 18, color: c.ink }}>{meetLabel}</Text>
          {exp.meeting ? <Text style={{ fontFamily: FONT.ui, color: c.muted }}>{exp.meeting}</Text> : null}
        </View>
      ) : null}

      {guide ? (
        <View style={card}>
          <Text style={h}>{t("trip.guide")}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {guide.photo_url ? (
              <Image source={guide.photo_url} style={{ width: 48, height: 48, borderRadius: 24 }} />
            ) : (
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.bg2, alignItems: "center", justifyContent: "center" }}><UserRound color={c.muted} size={24} /></View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT.heavy, fontSize: 15, color: c.ink }}>{guide.name}</Text>
              {guide.langs?.length > 0 && <Text style={{ fontFamily: FONT.ui, color: c.muted }}>{guide.langs.join(", ")}</Text>}
            </View>
          </View>
        </View>
      ) : null}

      {note && status === "confirmed" ? (
        <View style={card}>
          <Text style={h}>{t("trip.note")}</Text>
          <Text style={{ fontFamily: FONT.ui, lineHeight: 20, color: c.ink }}>{note}</Text>
        </View>
      ) : null}

      {plan.length > 0 ? (
        <View style={card}>
          <Text style={h}>{t("trip.plan")}</Text>
          {plan.map((p, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12 }}>
              <Text style={{ width: 48, fontFamily: FONT.bold, color: c.accent }}>{p.time}</Text>
              <Text style={{ flex: 1, fontFamily: FONT.ui, color: c.ink }}>{p.title}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {phone || tg ? (
        <View style={card}>
          <Text style={h}>{t("trip.contact", { name: agency?.name || "" })}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {phone && pill(MessageCircle, "WhatsApp", `https://wa.me/${digits(phone).replace("+", "")}`)}
            {tg && pill(Send, "Telegram", tg)}
            {phone && pill(Phone, t("trip.call"), `tel:${digits(phone)}`)}
          </View>
        </View>
      ) : null}

      {canTrip ? (
        <View style={card}>
          <Text style={h}>{t("chat.title")}</Text>
          <BookingChat bookingId={booking.id} side="tourist" closed={["declined", "cancelled", "expired"].includes(status)} />
        </View>
      ) : booking.synced ? (
        <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: c.muted, textAlign: "center" }}>{t("trip.loginForChat")}</Text>
      ) : null}

      {cancelError && <Text style={{ fontFamily: FONT.bold, color: c.accent }}>{t("ticket.cancelError")}</Text>}
      {["pending", "confirmed"].includes(status) &&
        (confirmCancel ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Button secondary title={t("ticket.keep")} disabled={cancelling} onPress={() => setConfirmCancel(false)} /></View>
            <View style={{ flex: 1 }}><Button title={t("ticket.confirmCancel")} disabled={cancelling} onPress={doCancel} /></View>
          </View>
        ) : (
          <Pressable onPress={() => setConfirmCancel(true)} style={{ alignItems: "center", padding: 12 }}>
            <Text style={{ fontFamily: FONT.bold, color: c.muted }}>{t("ticket.cancel")}</Text>
          </Pressable>
        ))}
    </Screen>
  );
}
