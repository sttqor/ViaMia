import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Bell, Minus, Plus, User, Users } from "lucide-react-native";
import { useSettings } from "../../../../src/settings-context";
import { useContent } from "../../../../src/content-context";
import { useAuth } from "../../../../src/auth-context";
import { makeCode, upcomingDates } from "../../../../src/data";
import { durationMinutes, weekdayShort } from "../../../../src/i18n";
import { submitBookingRequest } from "../../../../src/api";
import { useStore } from "../../../lib/store";
import { Screen } from "../../../lib/Screen";
import { LoginForm } from "../../../lib/LoginForm";
import { Button, IconButton } from "../../../lib/ui";
import { FONT, H, RADIUS, useColors } from "../../../lib/theme";

// бронь-заявка — как src/views/Booking.jsx; только из аккаунта
export default function BookScreen() {
  const { id } = useLocalSearchParams();
  const raw = useContent().byId(String(id));
  const { t, loc, money, plural, fmtDuration, lang } = useSettings();
  const { enabled: authOn, user } = useAuth();
  const { account, setBookings, rememberContact } = useStore();
  const c = useColors();
  const dates = useMemo(() => upcomingDates(), []);
  const [date, setDate] = useState(dates[1]?.key || dates[0].key);
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState(account?.name || "");
  const [contact, setContact] = useState(account?.contact || "");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [tried, setTried] = useState(false);
  const nameRef = useRef(null);
  const contactRef = useRef(null);
  if (!raw) return null;

  const exp = loc(raw);
  const total = exp.price == null ? null : exp.price * guests; // USD; null — цена по запросу
  const nameOk = name.trim().length >= 2;
  const contactOk = contact.trim().length >= 5;
  const needLogin = authOn && !user;

  async function submit() {
    if (sending) return;
    if (!nameOk || !contactOk) {
      setTried(true);
      (nameOk ? contactRef : nameRef).current?.focus();
      return;
    }
    setSending(true);
    setSendError(false);
    const entry = {
      exp: raw, date, guests, total, name: name.trim(), contact: contact.trim(),
      status: "pending", createdAt: new Date().toISOString(), code: makeCode(),
    };
    try {
      const { synced, id: rowId } = await submitBookingRequest(entry, lang);
      setBookings((b) => [{ ...entry, synced, id: rowId }, ...b]);
      rememberContact(entry);
      router.dismissAll();
      router.push(`/ticket/${entry.code}`);
    } catch (err) {
      console.warn("Заявка не отправилась", err);
      setSendError(true);
      setSending(false);
    }
  }

  const label = (text) => <Text style={{ fontFamily: FONT.heavy, fontSize: 16, color: c.ink, marginTop: 4 }}>{text}</Text>;
  const field = (ref, Icon, value, set, placeholder, bad, extra) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: H.btn, paddingHorizontal: 14, borderRadius: RADIUS.btn, borderWidth: 1, borderColor: bad ? c.accent : c.line, backgroundColor: c.card }}>
      <Icon color={c.muted} size={18} />
      <TextInput ref={ref} value={value} onChangeText={set} placeholder={placeholder} placeholderTextColor={c.muted} style={{ flex: 1, fontFamily: FONT.ui, fontSize: 16, color: c.ink }} {...extra} />
    </View>
  );
  const dayLabel = (d, i) => (i === 0 ? t("booking.today") : i === 1 ? t("booking.tomorrow") : weekdayShort(d.date, lang));

  return (
    <Screen title={t("booking.title")}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Image source={exp.image} style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: c.bg2 }} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONT.heavy, fontSize: 15, color: c.ink }}>{exp.title}</Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: c.muted }}>{`${fmtDuration(durationMinutes(exp.duration))} · ${exp.place}`}</Text>
        </View>
      </View>

      {needLogin ? (
        <LoginForm note={t("booking.loginWhy")} />
      ) : (
        <>
          {label(t("booking.when"))}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {dates.map((d, i) => {
              const on = d.key === date;
              return (
                <Pressable
                  key={d.key}
                  onPress={() => setDate(d.key)}
                  accessibilityState={{ selected: on }}
                  style={{ width: 64, paddingVertical: 10, borderRadius: 16, alignItems: "center", borderWidth: 1, borderColor: on ? c.solid : c.line, backgroundColor: on ? c.solid : c.card }}
                >
                  <Text style={{ fontFamily: FONT.bold, fontSize: 12, color: on ? c.onSolid : c.muted }}>{dayLabel(d, i)}</Text>
                  <Text style={{ fontFamily: FONT.heavy, fontSize: 20, color: on ? c.onSolid : c.ink }}>{d.date.getDate()}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {label(t("booking.guests"))}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
            <Users color={c.ink} size={18} />
            <Text style={{ flex: 1, fontFamily: FONT.bold, fontSize: 15, color: c.ink }}>{plural("pl.guests", guests)}</Text>
            <IconButton label={t("booking.fewer")} onPress={() => setGuests((g) => Math.max(1, g - 1))}>
              <Minus color={c.ink} size={18} />
            </IconButton>
            <IconButton label={t("booking.more")} onPress={() => setGuests((g) => Math.min(10, g + 1))}>
              <Plus color={c.ink} size={18} />
            </IconButton>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontFamily: FONT.ui, color: c.muted }}>
              {total == null ? plural("pl.guests", guests) : `${money(exp.price)} × ${plural("pl.guests", guests)}`}
            </Text>
            <Text style={{ fontFamily: FONT.heavy, fontSize: 18, color: c.ink }}>{total == null ? t("price.request") : money(total)}</Text>
          </View>

          {label(t("booking.contacts"))}
          {field(nameRef, User, name, setName, t("booking.name"), tried && !nameOk, { autoComplete: "name", textContentType: "name" })}
          {field(contactRef, Bell, contact, setContact, t("booking.contact"), tried && !contactOk, { autoComplete: "tel", textContentType: "telephoneNumber" })}
          <Text style={{ fontFamily: FONT.ui, fontSize: 13, lineHeight: 19, color: c.muted }}>{t("booking.note")}</Text>
          {sendError && <Text style={{ fontFamily: FONT.bold, color: c.accent }}>{t("booking.error")}</Text>}
          {tried && (!nameOk || !contactOk) && <Text style={{ fontFamily: FONT.bold, color: c.accent }}>{t("booking.fillHint")}</Text>}
          <Button
            disabled={sending}
            onPress={submit}
            title={sending ? t("booking.sending") : total == null ? t("booking.submitRequest") : t("booking.submit", { total: money(total) })}
          />
        </>
      )}
    </Screen>
  );
}
