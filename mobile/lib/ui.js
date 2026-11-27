import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { EASE_IN_OUT, EASE_OUT } from "./motion";
import { Image } from "expo-image";
import { router } from "expo-router";
import { BadgeCheck, Bell, ChevronLeft, Heart, Star } from "lucide-react-native";
import { useSettings } from "../../src/settings-context";
import { durationMinutes } from "../../src/i18n";
import { priceText } from "../../src/components/shared";
import { useStore } from "./store";
import { useAuth } from "../../src/auth-context";
import { fetchEvents, subscribeEvents } from "../../src/booking/booking-api";
import { FONT, H, RADIUS, useColors } from "./theme";

// нажатие «проседает» (TAP в src/components/shared.js: scale 0.97)
const APressable = Animated.createAnimatedComponent(Pressable);
export function PressScale({ style, onPressIn, onPressOut, ...rest }) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      {...rest}
      onPressIn={(e) => { s.set(withTiming(0.97, { duration: 120 })); onPressIn?.(e); }}
      onPressOut={(e) => { s.set(withTiming(1, { duration: 150 })); onPressOut?.(e); }}
      style={[style, anim]}
    />
  );
}

// текст, который меняется: новый въезжает снизу (Ticker в src/components/ui.jsx)
export function Ticker({ value, style }) {
  return (
    <Animated.Text key={String(value)} entering={FadeInDown.duration(220)} style={style}>
      {value}
    </Animated.Text>
  );
}

// кнопка 48 / радиус 14 (.cta): основная — терракота, вторичная — белая с рамкой
export function Button({ title, onPress, secondary, disabled, icon, ticker }) {
  const c = useColors();
  return (
    <PressScale
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={{
        height: H.btn,
        borderRadius: RADIUS.btn,
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 18,
        backgroundColor: secondary ? c.card : c.accent,
        borderWidth: secondary ? 1.5 : 0,
        borderColor: c.line,
        opacity: disabled ? 0.5 : 1,
        ...(secondary ? null : { shadowColor: c.accent, shadowOpacity: 0.28, shadowRadius: 8, shadowOffset: { width: 0, height: 6 } }),
      }}
    >
      {icon}
      {ticker ? (
        <Ticker value={title} style={{ fontFamily: FONT.heavy, fontSize: 15, color: secondary ? c.ink : "#FFFFFF" }} />
      ) : (
        <Text style={{ fontFamily: FONT.heavy, fontSize: 15, color: secondary ? c.ink : "#FFFFFF" }}>{title}</Text>
      )}
    </PressScale>
  );
}

// звёзды — только если есть свой рейтинг
export function StarRow({ rating }) {
  const c = useColors();
  if (rating == null) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Star color={c.gold} fill={c.gold} size={14} />
      <Text style={{ fontFamily: FONT.heavy, fontSize: 13, color: c.ink }}>{rating.toFixed(1)}</Text>
    </View>
  );
}

// метка «сам · бесплатно» / «с гидом · агентство» (.mode-label)
export function ModeLabel({ self, verified, children }) {
  const c = useColors();
  const color = self ? c.success : c.accentDark;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 22, paddingHorizontal: 9, borderRadius: RADIUS.chip, backgroundColor: self ? c.successBg : c.accentGlow, flexShrink: 1 }}>
      {verified && <BadgeCheck color={color} size={13} />}
      <Text numberOfLines={1} style={{ fontFamily: FONT.heavy, fontSize: 11, color, flexShrink: 1 }}>{children}</Text>
    </View>
  );
}

// карточка тура — как ExperienceCard в src/components/ui.jsx (каталог и избранное)
export function TourCard({ item: raw, onPress }) {
  const { t, loc, money, fmtDuration } = useSettings();
  const { saved, routeIds, toggleSave, toggleRoute } = useStore();
  const c = useColors();
  const e = loc(raw);
  const inRoute = routeIds.includes(raw.id);
  return (
    <View style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, overflow: "hidden" }}>
      <Pressable onPress={onPress}>
        <Image source={e.image} style={{ height: 168, backgroundColor: c.bg2 }} contentFit="cover" transition={200} />
      </Pressable>
      {e.badge ? (
        <View style={{ position: "absolute", top: 10, left: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.chip, backgroundColor: c.card }}>
          <Text style={{ fontFamily: FONT.heavy, fontSize: 11, color: c.ink }}>{e.badge}</Text>
        </View>
      ) : null}
      <View style={{ position: "absolute", top: 8, right: 8 }}>
        <SaveButton saved={saved.has(raw.id)} onPress={() => toggleSave(raw.id)} />
      </View>
      <View style={{ padding: 14 }}>
        <Text style={{ fontFamily: FONT.bold, fontSize: 11, letterSpacing: 0.22, color: c.muted, marginBottom: 4 }}>
          {`${e.type} · ${fmtDuration(durationMinutes(e.duration))}`}
        </Text>
        <Pressable onPress={onPress}>
          <Text style={{ fontFamily: FONT.heavy, fontSize: 15, lineHeight: 19.5, color: c.ink, marginBottom: 8 }}>{e.title}</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
          {e.selfGuided ? <View /> : e.agencyName ? (
            <ModeLabel verified={raw.agencyVerified}>{t("label.guided", { agency: e.agencyName })}</ModeLabel>
          ) : (
            <StarRow rating={e.rating} />
          )}
          <Text style={{ fontFamily: FONT.heavy, fontSize: 15, color: c.ink }}>{priceText(e, t, money)}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <PressScale
            accessibilityRole="button"
            onPress={() => toggleRoute(raw.id)}
            style={{ flex: 1, height: 44, borderRadius: RADIUS.chip, borderWidth: 1.5, borderColor: inRoute ? c.solid : c.line, backgroundColor: inRoute ? c.solid : c.card, alignItems: "center", justifyContent: "center", overflow: "hidden" }}
          >
            <Ticker value={t(inRoute ? "card.inRoute" : "card.addRoute")} style={{ fontFamily: FONT.bold, fontSize: 13, color: inRoute ? c.onSolid : c.ink }} />
          </PressScale>
          <PressScale
            accessibilityRole="button"
            onPress={onPress}
            style={{ flex: 1.2, height: 44, borderRadius: RADIUS.btn, backgroundColor: c.accent, alignItems: "center", justifyContent: "center", shadowColor: c.accent, shadowOpacity: 0.28, shadowRadius: 8, shadowOffset: { width: 0, height: 6 } }}
          >
            <Text style={{ fontFamily: FONT.heavy, fontSize: 13, color: "#FFFFFF" }}>{t("common.details")}</Text>
          </PressScale>
        </View>
      </View>
    </View>
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

// сердечко 38 (.save-btn): при добавлении — короткий «прыжок»
export function SaveButton({ saved, onPress }) {
  const { t } = useSettings();
  const c = useColors();
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      onPress={() => {
        if (!saved) s.set(withSequence(withTiming(1.22, { duration: 140, easing: EASE_OUT }), withTiming(1, { duration: 180, easing: EASE_IN_OUT }))); // пульс подтверждения
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={t(saved ? "common.unsave" : "common.save")}
      hitSlop={6}
      style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: c.card, borderWidth: 1, borderColor: c.line, transform: [{ scale: pressed ? 0.9 : 1 }] })}
    >
      <Animated.View style={anim}>
        <Heart color={saved ? c.accent : c.ink} fill={saved ? c.accent : "transparent"} size={18} />
      </Animated.View>
    </Pressable>
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
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- новый объект user при обновлении токена — не повод переподписываться

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

// переключатель в стиле iOS (src/Segmented.jsx): ползунок переезжает (ease-in-out, растяжение в пути). options [{ value, label }]
export function Segmented({ label, value, onChange, options }) {
  const c = useColors();
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);
  const slot = w / options.length;
  const lastSlot = useRef(0);
  const stretch = useSharedValue(1);
  useEffect(() => {
    // первый замер ширины — сразу на место, дальше — ease-in-out, в пути ползунок вытянут на 12%
    if (lastSlot.current === slot) {
      x.set(withTiming(idx * slot, { duration: 280, easing: EASE_IN_OUT }));
      stretch.set(withSequence(withTiming(1.12, { duration: 140, easing: EASE_OUT }), withTiming(1, { duration: 140, easing: EASE_IN_OUT })));
    } else x.set(idx * slot);
    lastSlot.current = slot;
  }, [idx, slot, x, stretch]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scaleX: stretch.value }] }));
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ padding: 3, borderRadius: RADIUS.chip, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
      <View style={{ flexDirection: "row" }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && (
          <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, left: 0, width: slot, borderRadius: RADIUS.chip, backgroundColor: c.solid, shadowColor: "#1E2638", shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } }, thumb]} />
        )}
        {options.map((o) => {
          const on = value === o.value;
          return (
            <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={({ pressed }) => ({ flex: 1, height: H.chip, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>
              <Text numberOfLines={1} style={{ fontFamily: FONT.bold, fontSize: 13, color: on ? c.onSolid : c.muted }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// чипы категорий: тёмная подложка переезжает к выбранному (ChipRow в src/components/ui.jsx)
export function ChipRow({ items, value, onChange }) {
  const { loc } = useSettings();
  const c = useColors();
  const [boxes, setBoxes] = useState({});
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const box = boxes[value];
  useEffect(() => {
    if (!box) return;
    const first = width.get() === 0;
    x.set(first ? box.x : withTiming(box.x, { duration: 280, easing: EASE_IN_OUT }));
    width.set(first ? box.width : withTiming(box.width, { duration: 280, easing: EASE_IN_OUT }));
  }, [box, x, width]);
  const thumb = useAnimatedStyle(() => ({ width: width.value, transform: [{ translateX: x.value }] }));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 }}>
      {box && <Animated.View style={[{ position: "absolute", left: 0, top: 4, height: H.chip, borderRadius: RADIUS.chip, backgroundColor: c.solid }, thumb]} />}
      {items.map((cat) => {
        const on = value === cat.id;
        return (
          <PressScale
            key={cat.id}
            onPress={() => onChange(cat.id)}
            onLayout={(e) => {
              const { x: bx, width: bw } = e.nativeEvent.layout;
              setBoxes((b) => (b[cat.id]?.x === bx && b[cat.id]?.width === bw ? b : { ...b, [cat.id]: { x: bx, width: bw } }));
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{ height: H.chip, borderRadius: RADIUS.chip, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderColor: on ? c.solid : c.line, backgroundColor: on ? (box ? "transparent" : c.solid) : c.card }}
          >
            <cat.Icon color={on ? c.onSolid : c.ink} size={14} />
            <Text style={{ fontFamily: FONT.bold, fontSize: 13, color: on ? c.onSolid : c.ink }}>{loc(cat).label}</Text>
          </PressScale>
        );
      })}
    </ScrollView>
  );
}
