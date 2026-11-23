import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { SendHorizontal } from "lucide-react-native";
import { useSettings } from "../../src/settings-context";
import { fetchMessages, markChatRead, sendMessage, subscribeMessages } from "../../src/booking/booking-api";
import { IconButton } from "./ui";
import { FONT, RADIUS, useColors } from "./theme";

// чат по брони — как src/booking/BookingChat.jsx; side: "tourist" | "agency" — чьи сообщения справа
export function BookingChat({ bookingId, side, closed = false }) {
  const { t, locale } = useSettings();
  const c = useColors();
  const [list, setList] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let off = false;
    fetchMessages(bookingId)
      .then((d) => {
        if (off) return;
        setList(d);
        markChatRead(bookingId).catch(() => {});
      })
      .catch(() => !off && setError(true));
    const unsub = subscribeMessages(bookingId, (m) => {
      setList((l) => (l && !l.some((x) => x.id === m.id) ? [...l, m] : l));
      markChatRead(bookingId).catch(() => {});
    });
    return () => {
      off = true;
      unsub();
    };
  }, [bookingId]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(false);
    try {
      const m = await sendMessage(bookingId, body);
      setList((l) => ((l || []).some((x) => x.id === m.id) ? l : [...(l || []), m]));
      setText("");
    } catch (err) {
      console.warn(err);
      setError(true);
    } finally {
      setSending(false);
    }
  }

  const mine = (m) => (side === "agency" ? m.from_agency : !m.from_agency);
  const time = (iso) => {
    try {
      return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
    } catch {
      return "";
    }
  };
  const hint = (key) => <Text style={{ fontFamily: FONT.ui, fontSize: 14, color: c.muted, textAlign: "center", paddingVertical: 8 }}>{t(key)}</Text>;

  return (
    <View style={{ gap: 8 }} accessibilityLabel={t("chat.title")}>
      {list === null && !error && hint("chat.loading")}
      {list?.length === 0 && hint(side === "agency" ? "chat.emptyAgency" : "chat.emptyTourist")}
      {list?.map((m) => {
        const me = mine(m);
        return (
          <View key={m.id} style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: "85%", padding: 10, borderRadius: 16, backgroundColor: me ? c.solid : c.bg2, gap: 2 }}>
            <Text style={{ fontFamily: FONT.bold, fontSize: 11, color: me ? c.onSolid : c.muted }}>{m.from_agency ? t("chat.agency") : t("chat.tourist")}</Text>
            <Text style={{ fontFamily: FONT.ui, fontSize: 15, lineHeight: 20, color: me ? c.onSolid : c.ink }}>{m.body}</Text>
            <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: me ? c.onSolid : c.muted, opacity: 0.8 }}>{time(m.created_at)}</Text>
          </View>
        );
      })}
      {error && <Text style={{ fontFamily: FONT.bold, color: c.accent }}>{t("chat.error")}</Text>}
      {closed ? (
        hint("chat.closed")
      ) : (
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
            placeholder={t("chat.placeholder")}
            placeholderTextColor={c.muted}
            accessibilityLabel={t("chat.placeholder")}
            style={{ flex: 1, minHeight: 44, maxHeight: 120, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, borderRadius: RADIUS.btn, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, fontFamily: FONT.ui, fontSize: 15, color: c.ink }}
          />
          <IconButton label={t("chat.send")} onPress={send}>
            <SendHorizontal color={text.trim() && !sending ? c.accent : c.muted} size={18} />
          </IconButton>
        </View>
      )}
    </View>
  );
}
