import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInRight, LinearTransition } from "react-native-reanimated";
import { ChevronDown, Shuffle } from "lucide-react-native";
import { TIP_TOPICS, TIPS } from "../../../src/tips-data";
import { useSettings } from "../../../src/settings-context";
import { Screen } from "../../lib/Screen";
import { FONT, H, RADIUS, useColors } from "../../lib/theme";

const topicOf = (id) => TIP_TOPICS.find((x) => x.id === id) || TIP_TOPICS[0];
const dayIndex = () => {
  const now = new Date();
  return Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
};

// «Советы» (этикет) — как src/Tips.jsx: совет дня, темы, раскрывающиеся карточки
export default function TipsScreen() {
  const { t, loc, plural } = useSettings();
  const c = useColors();
  const [day, setDay] = useState(() => dayIndex() % TIPS.length);
  const [topic, setTopic] = useState("all");
  const [open, setOpen] = useState(() => new Set());
  const list = topic === "all" ? TIPS : TIPS.filter((x) => x.topic === topic);
  const hero = loc(TIPS[day]);
  const HeroIcon = topicOf(hero.topic).Icon;
  const tagStyle = {
    must: { bg: c.dark ? "#3b2520" : "#fbeee8", fg: c.dark ? "#f2906a" : "#B8431F" },
    do: { bg: c.bg2, fg: c.ink },
    dont: { bg: c.solid, fg: "#FFFFFF" },
  };
  const toggle = (id) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <Screen title={t("tips.title")}>
      <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: c.muted, marginTop: -8 }}>{t("tips.subtitle")}</Text>

      {/* совет дня */}
      <Animated.View entering={FadeInDown.duration(450)} style={{ borderRadius: RADIUS.card, overflow: "hidden", padding: 18, gap: 10 }}>
        <LinearGradient colors={["#1E2638", "#2f3754"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", inset: 0 }} />
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ flex: 1, fontFamily: FONT.heavy, fontSize: 11, letterSpacing: 1, color: c.gold }}>{t("tips.ofDay")}</Text>
          <Pressable onPress={() => setDay((n) => (n + 1) % TIPS.length)} accessibilityLabel={t("tips.another")} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" }}>
            <Shuffle color="#FFFFFF" size={18} />
          </Pressable>
        </View>
        <Animated.View key={hero.id} entering={FadeInRight.duration(220)} style={{ gap: 8 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: c.accent }}>
            <HeroIcon color="#FFFFFF" size={22} />
          </View>
          <Text style={{ fontFamily: FONT.display, fontSize: 24, lineHeight: 29, color: "#FFFFFF" }}>{hero.title}</Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 14, lineHeight: 21, color: "rgba(255,255,255,0.88)" }}>{hero.text}</Text>
        </Animated.View>
      </Animated.View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TIP_TOPICS.map((x) => {
          const on = topic === x.id;
          return (
            <Pressable key={x.id} onPress={() => setTopic(x.id)} accessibilityState={{ selected: on }} style={{ height: H.chip, borderRadius: RADIUS.chip, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: on ? c.solid : c.card, borderWidth: 1, borderColor: on ? c.solid : c.line }}>
              <x.Icon color={on ? c.onSolid : c.ink} size={14} />
              <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: on ? c.onSolid : c.ink }}>{loc(x).label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: c.muted }}>{plural("pl.tips", list.length)}</Text>

      {list.map((raw, i) => {
        const tip = loc(raw);
        const Icon = topicOf(tip.topic).Icon;
        const isOpen = open.has(tip.id);
        const tag = tagStyle[tip.kind] || tagStyle.do;
        return (
          <Animated.View key={tip.id} entering={FadeInDown.delay(Math.min(i, 8) * 40)} layout={LinearTransition.springify()} style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, overflow: "hidden" }}>
            <Pressable onPress={() => toggle(tip.id)} accessibilityState={{ expanded: isOpen }} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 72, paddingVertical: 12, paddingHorizontal: 14 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: isOpen ? c.accent : c.bg2 }}>
                <Icon color={isOpen ? "#FFFFFF" : c.ink} size={20} />
              </View>
              <View style={{ flex: 1, gap: 4, alignItems: "flex-start" }}>
                <Text style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: "hidden", backgroundColor: tag.bg, color: tag.fg, fontFamily: FONT.bold, fontSize: 11 }}>{t(`tips.kind.${tip.kind}`)}</Text>
                <Text style={{ fontFamily: FONT.heavy, fontSize: 15, color: c.ink }}>{tip.title}</Text>
              </View>
              <ChevronDown color={c.muted} size={18} style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }} />
            </Pressable>
            {isOpen && (
              <Animated.Text entering={FadeInDown.duration(200)} style={{ paddingHorizontal: 14, paddingBottom: 14, fontFamily: FONT.ui, fontSize: 14, lineHeight: 21, color: c.ink }}>
                {tip.text}
              </Animated.Text>
            )}
          </Animated.View>
        );
      })}

      <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: c.muted }}>{t("tips.note")}</Text>
    </Screen>
  );
}
