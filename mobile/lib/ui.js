import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { BadgeCheck, Bell, ChevronLeft, Heart } from "lucide-react-native";
import { useSettings } from "../../src/settings-context";
import { durationMinutes } from "../../src/i18n";
import { priceText } from "../../src/components/shared";
import { useStore } from "./store";
import { useAuth } from "../../src/auth-context";
import { fetchEvents, subscribeEvents } from "../../src/booking/booking-api";
import { FONT, H, RADIUS, useColors } from "./theme";

// кнопка 48 / радиус 14: основная — терракота, вторичная — белая с рамкой
export function Button({ title, onPress, secondary, disabled }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        height: H.btn,
        borderRadius: RADIUS.btn,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 18,
        backgroundColor: secondary ? c.card : pressed ? c.accentHover : c.accent,
        borderWidth: secondary ? 1 : 0,
        borderColor: c.line,
        opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
      })}
    >
      <Text style={{ fontFamily: FONT.bold, fontSize: 16, color: secondary ? c.ink : "#FFFFFF" }}>{title}</Text>
    </Pressable>
  );
}

// карточка тура — для каталога и избранного
export function TourCard({ item, onPress }) {
  const { t, loc, money, fmtDuration } = useSettings();
  const { saved, toggleSave } = useStore();
  const c = useColors();
  const e = loc(item);
  return (
    <Pressable onPress={onPress} style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, overflow: "hidden" }}>
      <Image source={item.image} style={{ height: 180, backgroundColor: c.bg2 }} contentFit="cover" transition={200} />
      <View style={{ position: "absolute", top: 12, right: 12 }}>
        <SaveButton saved={saved.has(item.id)} onPress={() => toggleSave(item.id)} />
      </View>
      <View style={{ padding: 14, gap: 4 }}>
        <Text style={{ fontFamily: FONT.bold, fontSize: 12, color: c.muted }}>
          {[e.type, e.place, fmtDuration(durationMinutes(item.duration))].filter(Boolean).join(" · ")}
        </Text>
        <Text style={{ fontFamily: FONT.heavy, fontSize: 17, color: c.ink }}>{e.title}</Text>
        {item.agencyName ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            {item.agencyVerified && <BadgeCheck color={c.success} size={14} />}
            <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: c.muted }}>{item.agencyName}</Text>
          </View>
        ) : null}
        <Text style={{ fontFamily: FONT.heavy, fontSize: 15, color: c.accent, marginTop: 4 }}>{priceText(item, t, money)}</Text>
      </View>
    </Pressable>
  );
}

// круглая кнопка 44: белая с тонкой рамкой
export function IconButton({ onPress, label, children }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={{ width: H.iconBtn, height: H.iconBtn, borderRadius: H.iconBtn / 2, alignItems: "center", justifyContent: "center", backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}
    >
      {children}
    </Pressable>
  );
}

export function SaveButton({ saved, onPress }) {
  const { t } = useSettings();
  const c = useColors();
  return (
    <IconButton onPress={onPress} label={t(saved ? "common.unsave" : "common.save")}>
      <Heart color={saved ? c.accent : c.ink} fill={saved ? c.accent : "transparent"} size={20} />
    </IconButton>
  );
}

export function BackButton() {
  const { t } = useSettings();
  const c = useColors();
  return (
    <IconButton onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} label={t("common.back")}>
      <ChevronLeft color={c.ink} size={20} />
    </IconButton>
  );
}

// пустой экран: заголовок, текст, кнопка
export function Empty({ title, text, action, onAction }) {
  const c = useColors();
  return (
    <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
      <Text style={{ fontFamily: FONT.heavy, fontSize: 17, color: c.ink }}>{title}</Text>
      <Text style={{ fontFamily: FONT.ui, color: c.muted, textAlign: "center", lineHeight: 20 }}>{text}</Text>
      {action ? <View style={{ marginTop: 8 }}><Button title={action} onPress={onAction} /></View> : null}
    </View>
  );
}

// колокольчик с числом непрочитанных — живое обновление через Supabase Realtime (как EventsBell.jsx)
export function BellButton() {
  const { t } = useSettings();
  const { user } = useAuth();
  const c = useColors();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let off = false;
    const load = () =>
      fetchEvents()
        .then((d) => !off && setUnread(d.filter((e) => !e.to_agency && !e.read_at).length))
        .catch(() => {});
    load();
    const unsub = subscribeEvents(`bell-${user.id}`, load);
    return () => {
      off = true;
      unsub();
    };
  }, [user]);

  if (!user) return null;
  return (
    <IconButton
      label={t("bell.title")}
      onPress={() => {
        setUnread(0);
        router.push("/events");
      }}
    >
      <Bell color={c.ink} size={18} />
      {unread > 0 && (
        <View style={{ position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: FONT.heavy, fontSize: 11, color: "#FFFFFF" }}>{unread}</Text>
        </View>
      )}
    </IconButton>
  );
}
