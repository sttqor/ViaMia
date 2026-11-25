import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useSettings } from "../../../../src/settings-context";
import { useContent } from "../../../../src/content-context";
import { priceText } from "../../../../src/components/shared";
import { Button, PressScale } from "../../../lib/ui";
import { Screen } from "../../../lib/Screen";
import { DUR, EASE_IN_OUT, STAGGER, enter, enterRow } from "../../../lib/motion";
import { FONT, RADIUS, useColors } from "../../../lib/theme";

const HERO = 400;

// точка-индикатор: выбранная растягивается в «таблетку» (ease-in-out)
function Dot({ on, onPress, label }) {
  const c = useColors();
  const w = useAnimatedStyle(() => ({ width: withTiming(on ? 22 : 8, { duration: DUR.base, easing: EASE_IN_OUT }) }), [on]);
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityLabel={label} accessibilityState={{ selected: on }}>
      <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: on ? c.accent : c.line }, w]} />
    </Pressable>
  );
}

// факт целиком — как FactSheet в src/Facts.jsx: фото с параллаксом, текст на «листе», главное, тур, соседние факты
export default function FactScreen() {
  const { id } = useLocalSearchParams();
  const { t, loc, money } = useSettings();
  const { facts, byId } = useContent();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => y.set(e.contentOffset.y));

  // фото: вверх — уходит медленнее текста, вниз — растягивается (резинка за краем)
  const photo = useAnimatedStyle(() => {
    const v = y.get();
    return {
      transform: [
        { translateY: v > 0 ? v * 0.5 : v },
        { scale: v < 0 ? 1 + -v / HERO : 1 },
      ],
    };
  });
  const heroText = useAnimatedStyle(() => ({ opacity: interpolate(y.get(), [0, HERO * 0.45], [1, 0], Extrapolation.CLAMP) }));
  const bar = useAnimatedStyle(() => ({ opacity: interpolate(y.get(), [HERO - 140, HERO - 80], [0, 1], Extrapolation.CLAMP) }));

  const index = facts.findIndex((f) => f.id === id);
  if (index < 0) return <Screen title={t("facts.kicker")}><Text style={{ fontFamily: FONT.ui, color: c.muted }}>{t("common.nothing")}</Text></Screen>;
  const f = loc(facts[index]);
  const expRaw = f.expId ? byId(f.expId) : null;
  const exp = expRaw ? loc(expRaw) : null;
  const goFact = (i) => i >= 0 && i < facts.length && router.replace(`/fact/${encodeURIComponent(facts[i].id)}`);
  const body = f.body || [];
  let row = 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* обложка */}
        <View style={{ height: HERO, overflow: "visible" }}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.indigo }, photo]}>
            <Image source={f.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={DUR.slow} />
            <LinearGradient colors={["rgba(20,26,40,0.5)", "rgba(20,26,40,0)", "rgba(20,26,40,0.2)", "rgba(20,26,40,0.92)"]} locations={[0, 0.25, 0.55, 1]} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Animated.View style={[{ position: "absolute", left: 20, right: 20, bottom: 44 }, heroText]}>
            {f.tag ? (
              <Animated.Text entering={enter(80)} style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: "hidden", backgroundColor: c.gold, fontFamily: FONT.bold, fontSize: 12, color: "#1E2638" }}>
                {f.tag}
              </Animated.Text>
            ) : null}
            <Animated.Text entering={enter(80 + STAGGER * 2)} style={{ marginTop: 12, fontFamily: FONT.display, fontSize: 34, lineHeight: 38, color: "#FFFFFF" }}>
              {f.title}
            </Animated.Text>
            {f.short ? (
              <Animated.Text entering={enter(80 + STAGGER * 4)} style={{ marginTop: 10, fontFamily: FONT.ui, fontSize: 15, lineHeight: 22, color: "rgba(255,255,255,0.86)" }}>
                {f.short}
              </Animated.Text>
            ) : null}
          </Animated.View>
        </View>

        {/* лист с текстом наезжает на фото */}
        <View style={{ marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: c.bg, paddingHorizontal: 20, paddingTop: 26, gap: 16 }}>
          {body.map((p, i) => (
            <Animated.Text
              key={p}
              entering={enterRow(row++)}
              style={i === 0 ? { fontFamily: FONT.bold, fontSize: 18, lineHeight: 27, color: c.ink } : { fontFamily: FONT.ui, fontSize: 16, lineHeight: 25, color: c.ink, opacity: 0.88 }}
            >
              {p}
            </Animated.Text>
          ))}

          {f.points?.length > 0 && (
            <Animated.View entering={enterRow(row++)} style={{ padding: 18, gap: 14, borderRadius: RADIUS.card, backgroundColor: c.indigo }}>
              <Text style={{ fontFamily: FONT.heavy, fontSize: 12, letterSpacing: 1, color: c.gold }}>{t("facts.summary").toUpperCase()}</Text>
              {f.points.map((p, i) => (
                <Animated.View key={p} entering={enterRow(row++)} style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: c.gold }}>
                    <Text style={{ fontFamily: FONT.heavy, fontSize: 13, color: "#1E2638" }}>{i + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 15, lineHeight: 22, color: "#FFFFFF" }}>{p}</Text>
                </Animated.View>
              ))}
            </Animated.View>
          )}

          {/* связанный тур */}
          {exp && (
            <Animated.View entering={enterRow(row++)}>
              <PressScale onPress={() => router.push(`/tour/${encodeURIComponent(exp.id)}`)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
                <Image source={exp.image} style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: c.bg2 }} contentFit="cover" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text numberOfLines={2} style={{ fontFamily: FONT.heavy, fontSize: 15, color: c.ink }}>{exp.title}</Text>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: c.muted }}>{exp.place}</Text>
                  <Text style={{ fontFamily: FONT.heavy, fontSize: 14, color: c.accent }}>{priceText(expRaw, t, money)}</Text>
                </View>
                <ChevronRight color={c.muted} size={18} />
              </PressScale>
            </Animated.View>
          )}
          {!exp && f.linkTab && f.linkLabel ? (
            <Animated.View entering={enterRow(row++)}>
              <Button title={`${f.linkLabel} →`} onPress={() => router.navigate(`/${f.linkTab}`)} />
            </Animated.View>
          ) : null}

          {/* соседние факты */}
          {facts.length > 1 && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <PressScale disabled={index === 0} onPress={() => goFact(index - 1)} accessibilityLabel={t("facts.prev")} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.line, backgroundColor: c.card, opacity: index === 0 ? 0.35 : 1 }}>
                <ChevronLeft color={c.ink} size={18} />
              </PressScale>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {facts.map((x, i) => (
                  <Dot key={x.id} on={i === index} onPress={() => goFact(i)} label={t("facts.dot", { n: i + 1 })} />
                ))}
              </View>
              <PressScale disabled={index === facts.length - 1} onPress={() => goFact(index + 1)} accessibilityLabel={t("facts.next")} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.line, backgroundColor: c.card, opacity: index === facts.length - 1 ? 0.35 : 1 }}>
                <ChevronRight color={c.ink} size={18} />
              </PressScale>
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* шапка: проявляется, когда фото уехало */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 60, borderBottomWidth: 1, borderBottomColor: c.line, overflow: "hidden" }, bar]}>
        <BlurView intensity={40} tint={c.dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.glass }]} />
        <Text numberOfLines={1} style={{ position: "absolute", left: 72, right: 72, bottom: 18, textAlign: "center", fontFamily: FONT.heavy, fontSize: 15, color: c.ink }}>{f.title}</Text>
      </Animated.View>
      <View style={{ position: "absolute", top: insets.top + 8, left: 16 }}>
        <PressScale onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} accessibilityLabel={t("common.back")} style={{ width: 44, height: 44, borderRadius: 22, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.35)", backgroundColor: "rgba(20,26,40,0.35)" }}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={{ zIndex: 1 }}>
            <ChevronLeft color="#FFFFFF" size={20} />
          </View>
        </PressScale>
      </View>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", top: insets.top + 18, right: 20 }, heroText]}>
        <Text style={{ fontFamily: FONT.heavy, fontSize: 12, letterSpacing: 1, color: "#FFFFFF", textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 6 }}>{`${index + 1}/${facts.length}`}</Text>
      </Animated.View>
    </View>
  );
}
