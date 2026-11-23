import { useEffect, useLayoutEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { ChevronRight } from "lucide-react-native";
import { useSettings } from "../../../src/settings-context";
import { useContent } from "../../../src/content-context";
import { PressScale } from "../ui";
import { DUR, EASE_IN_OUT, EASE_OUT, STAGGER, enter, fadeIn } from "../motion";
import { FONT, RADIUS, useColors } from "../theme";

const H = 440;

// полоска прогресса: текущая заливается слева направо (маска), прошлые — полные
function Bar({ on }) {
  const p = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    p.set(withTiming(on ? 1 : 0, { duration: on ? DUR.slow : DUR.fast, easing: EASE_OUT }));
  }, [on, p]);
  const fill = useAnimatedStyle(() => ({ width: `${p.get() * 100}%` }));
  return (
    <View style={{ flex: 1, height: 4, borderRadius: 999, overflow: "hidden", backgroundColor: "rgba(0,0,0,0.25)", borderWidth: 1, borderColor: "rgba(255,255,255,0.55)" }}>
      <Animated.View style={[{ height: "100%", backgroundColor: "#FFFFFF" }, fill]} />
    </View>
  );
}

// один слайд; фото чуть отстаёт от пальца (глубина), активный при показе «оседает» 1.06 → 1
function Slide({ fact, width, offset, drag, active }) {
  const { t, loc } = useSettings();
  const c = useColors();
  const f = loc(fact);
  const settle = useSharedValue(active ? 1.06 : 1);
  useEffect(() => {
    if (active) {
      settle.set(1.06);
      settle.set(withTiming(1, { duration: 1100, easing: EASE_OUT }));
    }
  }, [active, settle]);
  const photo = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(drag.get(), [-width, 0, width], [width * 0.25, 0, -width * 0.25]) * (active ? 1 : 0) }, { scale: settle.get() }],
  }));

  return (
    <View style={{ position: "absolute", top: 0, bottom: 0, left: offset * width, width, overflow: "hidden" }}>
      <Animated.View style={[StyleSheet.absoluteFill, photo]}>
        <Image source={f.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={DUR.base} />
      </Animated.View>
      <LinearGradient colors={["rgba(20,26,40,0.55)", "rgba(20,26,40,0)"]} locations={[0, 0.22]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["rgba(20,26,40,0)", "rgba(20,26,40,0.78)", "rgba(20,26,40,0.96)"]} locations={[0.38, 0.66, 1]} style={StyleSheet.absoluteFill} />
      {/* текст: у активного слайда детали «оседают» лесенкой при каждом показе */}
      <View key={active ? `on-${fact.id}` : fact.id} style={{ position: "absolute", left: 18, right: 18, bottom: 18 }}>
        {f.tag ? (
          <Animated.Text entering={active ? enter(0) : undefined} style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: "hidden", backgroundColor: c.gold, fontFamily: FONT.bold, fontSize: 12, color: "#1E2638" }}>
            {f.tag}
          </Animated.Text>
        ) : null}
        <Animated.Text entering={active ? enter(STAGGER * 2) : undefined} numberOfLines={2} style={{ marginTop: 10, marginBottom: 8, fontFamily: FONT.display, fontSize: 28, lineHeight: 31, color: "#FFFFFF" }}>
          {f.title}
        </Animated.Text>
        <Animated.Text entering={active ? enter(STAGGER * 4) : undefined} numberOfLines={2} style={{ marginBottom: 16, fontFamily: FONT.ui, fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.88)" }}>
          {f.short}
        </Animated.Text>
        <Animated.View entering={active ? enter(STAGGER * 6) : undefined} style={{ alignSelf: "flex-start" }}>
          <PressScale
            onPress={() => router.push(`/fact/${encodeURIComponent(fact.id)}`)}
            accessibilityRole="button"
            style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44, paddingLeft: 20, paddingRight: 16, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", backgroundColor: "rgba(255,255,255,0.16)" }}
          >
            <Text style={{ fontFamily: FONT.heavy, fontSize: 14, color: "#FFFFFF" }}>{t("facts.read")}</Text>
            <ChevronRight color="#FFFFFF" size={16} />
          </PressScale>
        </Animated.View>
      </View>
    </View>
  );
}

// «сторис» фактов — как FactsSection в src/Facts.jsx, но лентой: слайд едет за пальцем,
// на краях — резиновое сопротивление, отпустили дальше трети или резко — следующий (ease-in-out)
export function FactStory() {
  const { t } = useSettings();
  const { facts } = useContent();
  const c = useColors();
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const drag = useSharedValue(0);
  const n = facts.length;
  const current = Math.min(index, Math.max(n - 1, 0));

  const commit = (step) => setIndex((i) => Math.min(Math.max(Math.min(i, n - 1) + step, 0), n - 1));
  // уехать на соседний слайд, потом тихо вернуть ленту в ноль уже с новым текущим
  const go = (step) => {
    "worklet";
    drag.set(
      withTiming(-step * width, { duration: 300, easing: EASE_IN_OUT }, (done) => {
        if (!done) return;
        runOnJS(commit)(step);
      })
    );
  };
  // после смены текущего слайда лента снова в нуле (без анимации — картинка та же)
  useLayoutEffect(() => {
    drag.set(0);
  }, [current, drag]);

  const canPrev = current > 0;
  const canNext = current < n - 1;
  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      const x = e.translationX;
      const edge = (x > 0 && !canPrev) || (x < 0 && !canNext);
      drag.set(edge ? x * 0.25 : x); // резинка за краем
    })
    .onEnd((e) => {
      const x = e.translationX;
      const step = x < -width / 3 || e.velocityX < -600 ? 1 : x > width / 3 || e.velocityX > 600 ? -1 : 0;
      if ((step === 1 && canNext) || (step === -1 && canPrev)) go(step);
      else drag.set(withTiming(0, { duration: DUR.base, easing: EASE_OUT }));
    });
  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((e) => {
      if (e.y > H - 190) return; // нижняя часть — текст и «Читать»
      if (e.x < width * 0.38 && canPrev) go(-1);
      else if (e.x > width * 0.62 && canNext) go(1);
    });
  const track = useAnimatedStyle(() => ({ transform: [{ translateX: drag.get() }] }));

  if (!facts[current]) return null;
  const visible = [current - 1, current, current + 1].filter((i) => i >= 0 && i < n);

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityLabel={t("facts.title")}
        style={{ height: H, borderRadius: RADIUS.card, overflow: "hidden", backgroundColor: c.indigo }}
      >
        {width > 0 && (
          <Animated.View style={[StyleSheet.absoluteFill, track]}>
            {visible.map((i) => (
              <Slide key={facts[i].id} fact={facts[i]} width={width} offset={i - current} drag={drag} active={i === current} />
            ))}
          </Animated.View>
        )}
        <View style={{ position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", gap: 5 }} pointerEvents="none">
          {facts.map((x, i) => (
            <Bar key={x.id} on={i <= current} />
          ))}
        </View>
        <Animated.Text key={current} entering={fadeIn(DUR.fast)} pointerEvents="none" style={{ position: "absolute", top: 24, left: 14, fontFamily: FONT.heavy, fontSize: 11, letterSpacing: 1, color: "#FFFFFF" }}>
          {`${t("facts.kicker")} · ${current + 1}/${n}`}
        </Animated.Text>
      </View>
    </GestureDetector>
  );
}
