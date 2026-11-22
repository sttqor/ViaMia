import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { Volume2 } from "lucide-react-native";
import { fallbackOf } from "../../src/i18n";
import { PHRASES } from "../../src/home-data";
import { useSettings } from "../../src/settings-context";
import { FONT, RADIUS, useColors } from "./theme";

const STACK = 3; // сколько карточек видно
const SPRING = { stiffness: 400, damping: 32 };
const dayIndex = () => {
  const now = new Date();
  return Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
};

// верхняя карточка тянется пальцем, наклоняется и перетекает в терракоту; дальше порога — улетает в конец
function TopPhrase({ phrase, onGone, speaking, onSpeak }) {
  const { t, lang } = useSettings();
  const c = useColors();
  const [flipped, setFlipped] = useState(false);
  const x = useSharedValue(0);
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.set(withSpring(1, SPRING));
  }, [enter]);
  const translation = (lang !== "ky" && phrase[lang]) || phrase[fallbackOf(lang)];
  const sound = `[${phrase.tr[lang] || phrase.tr[fallbackOf(lang)]}]`;

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      x.set(e.translationX * 0.9);
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > 90 || Math.abs(e.velocityX) > 600) {
        const dir = e.translationX < 0 ? -1 : 1;
        x.set(withTiming(dir * 420, { duration: 240 }, () => runOnJS(onGone)()));
      } else x.set(withSpring(0, SPRING));
    });
  const tap = Gesture.Tap().onEnd(() => runOnJS(setFlipped)((f) => !f));

  const card = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: (1 - enter.value) * 12 },
      { scale: 0.95 + enter.value * 0.05 },
      { rotate: `${interpolate(x.value, [-240, 0, 240], [-10, 0, 10])}deg` },
    ],
  }));
  const glow = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-160, 0, 160], [1, 0, 1], "clamp") }));

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <Animated.View style={[styles.card, { zIndex: STACK }, card]}>
        <LinearGradient colors={["#1E2638", "#2f3754"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Animated.View style={[StyleSheet.absoluteFill, glow]}>
          <LinearGradient colors={["#2f3754", c.accent, c.gold]} locations={[0, 0.6, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <View style={{ flex: 1, padding: 16, paddingRight: 72, justifyContent: "space-between" }}>
          <Text style={{ fontFamily: FONT.heavy, fontSize: 11, letterSpacing: 1, color: c.gold }}>{t("phrase.kicker")}</Text>
          <Animated.View key={String(flipped)} entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
            <Text style={{ fontFamily: FONT.display, fontSize: 28, lineHeight: 32, color: "#FFFFFF" }}>{flipped ? translation : phrase.ky}</Text>
            <Text style={{ marginTop: 6, fontFamily: FONT.bold, fontSize: 15, color: "rgba(255,255,255,0.88)" }}>{flipped ? `${phrase.ky} ${sound}` : sound}</Text>
            <Text style={{ marginTop: 6, fontFamily: FONT.ui, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{flipped ? t("phrase.tapBack") : t("phrase.tap")}</Text>
          </Animated.View>
        </View>
        <Pressable
          onPress={onSpeak}
          accessibilityRole="button"
          accessibilityLabel={t("phrase.listen")}
          style={{ position: "absolute", right: 16, bottom: 16, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: speaking ? c.accent : "rgba(255,255,255,0.3)", backgroundColor: speaking ? c.accent : "rgba(255,255,255,0.12)" }}
        >
          <Volume2 color="#FFFFFF" size={20} />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

// стопка фраз — как PhraseStack в src/HomeBlocks.jsx; speak(i, text) — озвучка
export function PhraseStack({ speaking, speak }) {
  const { t } = useSettings();
  const c = useColors();
  const [start] = useState(() => dayIndex() % PHRASES.length);
  const [order, setOrder] = useState(() => PHRASES.map((_, i) => (start + i) % PHRASES.length));
  const next = () => setOrder((o) => [...o.slice(1), o[0]]);
  const number = ((order[0] - start + PHRASES.length) % PHRASES.length) + 1;

  return (
    <View>
      <View style={{ height: 188, marginBottom: 34 }}>
        {order
          .slice(0, STACK)
          .map((idx, pos) =>
            pos === 0 ? (
              <TopPhrase key={idx} phrase={PHRASES[idx]} onGone={next} speaking={speaking === idx} onSpeak={() => speak(idx, PHRASES[idx].ky)} />
            ) : (
              <Animated.View
                key={idx}
                style={[styles.card, { zIndex: STACK - pos, backgroundColor: "#1E2638", opacity: 1 - pos * 0.25, transform: [{ translateY: pos * 12 }, { scale: 1 - pos * 0.05 }] }]}
              />
            )
          )
          .reverse()}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: c.muted }}>{t("phrase.swipe")}</Text>
        <Text style={{ fontFamily: FONT.bold, fontSize: 13, color: c.muted }}>{`${number}/${PHRASES.length}`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS.card, overflow: "hidden", transformOrigin: "50% 100%" },
});
