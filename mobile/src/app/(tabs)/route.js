import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useScrollToTop } from "expo-router";
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition, ZoomIn } from "react-native-reanimated";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronDown, ChevronUp, Clock, Compass, MapPin, MoreHorizontal, Route as RouteIcon, Trash2 } from "lucide-react-native";
import { useSettings } from "../../../../src/settings-context";
import { planRoute } from "../../../../src/route-plan";
import { TABBAR_SPACE } from "../../../lib/TabBar";
import { useStore } from "../../../lib/store";
import { Button, Ticker } from "../../../lib/ui";
import { FONT, RADIUS, useColors } from "../../../lib/theme";

const SPRING_LAYOUT = LinearTransition.springify().stiffness(400).damping(32);

// пунктир между точками (в RN у одной стороны рамки dashed не рисуется)
function DashedLine({ color }) {
  return (
    <View style={{ flex: 1, width: 2, marginTop: 2, overflow: "hidden" }}>
      {/* абсолютно, чтобы черточки не растягивали строку */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, gap: 4 }}>
        {Array.from({ length: 40 }, (_, i) => (
          <View key={i} style={{ height: 5, backgroundColor: color }} />
        ))}
      </View>
    </View>
  );
}

// меню «…» у точки: выше / ниже / удалить (PlaceMenu в src/views/RouteView.jsx)
function PlaceMenu({ open, onToggle, canUp, canDown, onUp, onDown, onRemove }) {
  const { t } = useSettings();
  const c = useColors();
  const item = (Icon, label, onPress, disabled, danger) => (
    <Pressable
      key={label}
      accessibilityRole="menuitem"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: pressed ? c.bg2 : "transparent", opacity: disabled ? 0.35 : 1 })}
    >
      <Icon color={danger ? c.accentDark : c.ink} size={16} />
      <Text style={{ fontFamily: FONT.bold, fontSize: 13, color: danger ? c.accentDark : c.ink }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ margin: -6, marginLeft: 0, marginBottom: 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("route.more")}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}
      >
        <MoreHorizontal color={c.muted} size={18} />
      </Pressable>
      {open && (
        <Animated.View
          entering={ZoomIn.duration(150)}
          exiting={FadeOut.duration(150)}
          accessibilityRole="menu"
          style={{ position: "absolute", top: 48, right: 0, minWidth: 176, padding: 6, borderRadius: RADIUS.btn, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, shadowColor: "#000", shadowOpacity: c.dark ? 0.45 : 0.12, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, elevation: 12 }}
        >
          {item(ChevronUp, t("route.up"), onUp, !canUp)}
          {item(ChevronDown, t("route.down"), onDown, !canDown)}
          {item(Trash2, t("route.remove"), onRemove, false, true)}
        </Animated.View>
      )}
    </View>
  );
}

// маршрут дня — как src/views/RouteView.jsx: итоги, таймлайн со временем, меню «…», навигация
export default function RouteScreen() {
  const { t, loc, plural, fmtDuration, locale } = useSettings();
  const { routeItems: items, routeIds, setRouteIds } = useStore();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const scroll = useRef(null);
  useScrollToTop(scroll);
  const [expandedId, setExpandedId] = useState(null);
  const [menuId, setMenuId] = useState(null);

  const { legs, totalKm, totalMin, times } = planRoute(items);
  const fmtKm = (km) => t("unit.km", { n: km.toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) });

  // меняем полный список id: туров, которых пока нет в каталоге (он ещё из кэша), не теряем
  const move = (i, d) => {
    const a = routeIds.indexOf(items[i].id);
    const b = routeIds.indexOf(items[i + d].id);
    const next = [...routeIds];
    [next[a], next[b]] = [next[b], next[a]];
    setRouteIds(next);
  };
  const remove = (id) => setRouteIds(routeIds.filter((x) => x !== id));
  const act = (fn) => () => {
    fn();
    setMenuId(null);
  };
  const goTours = () => router.navigate("/tours");

  const stat = (Icon, value, label) => (
    <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5, overflow: "hidden" }}>
        <Icon color={c.accent} size={16} />
        <Ticker value={value} style={{ fontFamily: FONT.heavy, fontSize: 15, color: c.ink }} />
      </View>
      <Text style={{ fontFamily: FONT.bold, fontSize: 11, letterSpacing: 0.44, textTransform: "uppercase", color: c.muted }}>{label}</Text>
    </View>
  );
  const divider = <View style={{ width: 1, alignSelf: "stretch", marginVertical: 2, backgroundColor: c.line }} />;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView ref={scroll} onScrollBeginDrag={() => setMenuId(null)} contentContainerStyle={{ paddingBottom: TABBAR_SPACE + 16 }}>
        <View style={{ paddingTop: insets.top + 18, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: c.card, borderBottomWidth: 1, borderColor: c.line }}>
          <Text style={{ fontFamily: FONT.bold, fontSize: 11, letterSpacing: 0.22, color: c.muted, marginBottom: 4 }}>{t("route.kicker")}</Text>
          <Text style={{ fontFamily: FONT.display, fontSize: 22, lineHeight: 26.4, color: c.ink, marginTop: 2, marginBottom: 8 }}>{t("route.title")}</Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 13, lineHeight: 18, color: c.muted }}>{t("route.subtitle")}</Text>
        </View>

        <View style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 6, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
            {stat(MapPin, items.length === 0 ? t("unit.km", { n: 0 }) : fmtKm(totalKm), t("route.walk"))}
            {divider}
            {stat(Clock, fmtDuration(items.length === 0 ? 0 : totalMin), t("route.time"))}
            {divider}
            {stat(RouteIcon, items.length, t("route.points"))}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ fontFamily: FONT.bold, fontSize: 17, color: c.ink }}>{t("route.listTitle")}</Text>
            <Pressable onPress={goTours} style={{ minHeight: 44, paddingHorizontal: 4, justifyContent: "center" }}>
              <Text style={{ fontFamily: FONT.heavy, fontSize: 13, color: c.accentDark }}>{t("route.addPlace")}</Text>
            </Pressable>
          </View>

          {items.length === 0 ? (
            <Animated.View entering={FadeInDown.duration(300)} style={{ alignItems: "center", paddingVertical: 36, paddingHorizontal: 20, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
              <Animated.View entering={ZoomIn.springify().stiffness(260).damping(16).delay(100)}>
                <Compass color={c.accent} size={40} />
              </Animated.View>
              <Text style={{ fontFamily: FONT.heavy, fontSize: 17, color: c.ink, marginTop: 12, marginBottom: 6 }}>{t("route.emptyTitle")}</Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 13, lineHeight: 19, color: c.muted, textAlign: "center", marginBottom: 16 }}>{t("route.emptyText")}</Text>
              <View style={{ alignSelf: "stretch" }}>
                <Button title={t("route.goTours")} onPress={goTours} />
              </View>
            </Animated.View>
          ) : (
            <>
              <View>
                {menuId && <Pressable style={{ position: "absolute", top: -1000, bottom: -1000, left: -16, right: -16, zIndex: 4 }} onPress={() => setMenuId(null)} />}
                {items.map((raw, idx) => {
                  const item = loc(raw);
                  const isOpen = expandedId === raw.id;
                  const menuOpen = menuId === raw.id;
                  const leg = legs[idx];
                  const legText = leg < 1 ? t("unit.m", { n: Math.round(leg * 1000) }) : fmtKm(leg);
                  return (
                    <Animated.View
                      key={raw.id}
                      layout={SPRING_LAYOUT}
                      entering={FadeIn.duration(200)}
                      exiting={FadeOut.duration(150)}
                      style={{ flexDirection: "row", gap: 10, zIndex: menuOpen ? 5 : 0, elevation: menuOpen ? 12 : 0 }}
                    >
                      <View style={{ width: 46, alignItems: "center", paddingTop: 4 }}>
                        <Text style={{ fontFamily: FONT.heavy, fontSize: 11, color: c.inkSoft, marginBottom: 6 }}>{times[idx]}</Text>
                        <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: c.accent, backgroundColor: c.card }} />
                        {idx < items.length - 1 && <DashedLine color={c.line} />}
                      </View>

                      <View style={{ flex: 1, padding: 12, marginBottom: 14, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
                        {idx > 0 && (
                          <Text style={{ fontFamily: FONT.bold, fontSize: 11, color: c.accentDark, marginTop: -2, marginBottom: 8 }}>{t("route.leg", { dist: legText })}</Text>
                        )}
                        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                          <Image source={item.image} style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: c.bg2 }} contentFit="cover" />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ fontFamily: FONT.heavy, fontSize: 15, lineHeight: 18.75, color: c.ink }}>{item.title}</Text>
                            <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: c.muted, marginTop: 2, marginBottom: 4 }}>{`${item.type} · ${item.place}`}</Text>
                            {isOpen && (
                              <Animated.Text entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={{ fontFamily: FONT.ui, fontSize: 13, lineHeight: 19.5, color: c.inkSoft, marginBottom: 4 }}>
                                {item.description}
                              </Animated.Text>
                            )}
                            <Pressable onPress={() => setExpandedId(isOpen ? null : raw.id)} hitSlop={8} style={{ alignSelf: "flex-start" }}>
                              <Text style={{ fontFamily: FONT.heavy, fontSize: 13, color: c.accentDark }}>{isOpen ? t("route.hide") : t("common.details")}</Text>
                            </Pressable>
                          </View>
                          <PlaceMenu
                            open={menuOpen}
                            onToggle={() => setMenuId(menuOpen ? null : raw.id)}
                            canUp={idx > 0}
                            canDown={idx < items.length - 1}
                            onUp={act(() => move(idx, -1))}
                            onDown={act(() => move(idx, 1))}
                            onRemove={act(() => remove(raw.id))}
                          />
                        </View>
                      </View>
                    </Animated.View>
                  );
                })}
              </View>
              <Animated.View layout={SPRING_LAYOUT} style={{ marginTop: 16 }}>
                <Button
                  title={t("route.navigate", { stops: plural("pl.stops", items.length) })}
                  onPress={() => router.navigate({ pathname: "/map", params: { nav: "1", ids: items.map((x) => x.id).join(",") } })}
                />
              </Animated.View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
