import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut, runOnJS } from "react-native-reanimated";
import { ChevronRight } from "lucide-react-native";
import { useSettings } from "../../../src/settings-context";
import { useContent } from "../../../src/content-context";
import { FONT, RADIUS, useColors } from "../theme";

// «сторис» фактов — как FactsSection в src/Facts.jsx: свайп или тап по краям — соседний факт,
// полоски сверху, «Читать» открывает факт целиком
export function FactStory() {
  const { t, loc } = useSettings();
  const { facts } = useContent();
  const c = useColors();
  const [slide, setSlide] = useState(0);
  const current = Math.min(slide, Math.max(facts.length - 1, 0));
  const move = (step) => setSlide((s) => Math.min(Math.max(Math.min(s, facts.length - 1) + step, 0), facts.length - 1));
  const swipe = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .onEnd((e) => {
      if (e.translationX < -50 || e.velocityX < -500) runOnJS(move)(1);
      else if (e.translationX > 50 || e.velocityX > 500) runOnJS(move)(-1);
    });
  if (!facts[current]) return null;
  const f = loc(facts[current]);

  return (
    <GestureDetector gesture={swipe}>
      <View accessibilityLabel={t("facts.title")} style={{ height: 440, borderRadius: RADIUS.card, overflow: "hidden", backgroundColor: c.indigo }}>
        <Animated.View key={f.id} entering={FadeIn.duration(350)} exiting={FadeOut.duration(250)} style={StyleSheet.absoluteFill}>
          <Image source={f.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          <LinearGradient colors={["rgba(20,26,40,0.55)", "rgba(20,26,40,0)"]} locations={[0, 0.22]} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={["rgba(20,26,40,0)", "rgba(20,26,40,0.78)", "rgba(20,26,40,0.96)"]} locations={[0.38, 0.66, 1]} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Pressable style={{ position: "absolute", left: 0, top: 0, bottom: 190, width: "38%" }} onPress={() => move(-1)} accessibilityLabel={t("facts.prev")} />
        <Pressable style={{ position: "absolute", right: 0, top: 0, bottom: 190, width: "38%" }} onPress={() => move(1)} accessibilityLabel={t("facts.next")} />
        <View style={{ position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", gap: 5 }} pointerEvents="none">
          {facts.map((x, i) => (
            <View key={x.id} style={{ flex: 1, height: 4, borderRadius: 999, backgroundColor: i <= current ? "#FFFFFF" : "rgba(0,0,0,0.25)", borderWidth: i <= current ? 0 : 1, borderColor: "rgba(255,255,255,0.55)" }} />
          ))}
        </View>
        <Text pointerEvents="none" style={{ position: "absolute", top: 24, left: 14, fontFamily: FONT.heavy, fontSize: 11, letterSpacing: 1, color: "#FFFFFF" }}>
          {`${t("facts.kicker")} · ${current + 1}/${facts.length}`}
        </Text>
        <View style={{ position: "absolute", left: 18, right: 18, bottom: 18 }}>
          {f.tag ? <Text style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: "hidden", backgroundColor: c.gold, fontFamily: FONT.bold, fontSize: 12, color: "#1E2638" }}>{f.tag}</Text> : null}
          <Text numberOfLines={2} style={{ marginTop: 10, marginBottom: 8, fontFamily: FONT.display, fontSize: 28, lineHeight: 31, color: "#FFFFFF" }}>{f.title}</Text>
          <Text numberOfLines={2} style={{ marginBottom: 16, fontFamily: FONT.ui, fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.88)" }}>{f.short}</Text>
          <Pressable
            onPress={() => router.push(`/fact/${encodeURIComponent(f.id)}`)}
            style={({ pressed }) => ({ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44, paddingLeft: 20, paddingRight: 16, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", backgroundColor: "rgba(255,255,255,0.16)", transform: [{ scale: pressed ? 0.96 : 1 }] })}
          >
            <Text style={{ fontFamily: FONT.heavy, fontSize: 14, color: "#FFFFFF" }}>{t("facts.read")}</Text>
            <ChevronRight color="#FFFFFF" size={16} />
          </Pressable>
        </View>
      </View>
    </GestureDetector>
  );
}
