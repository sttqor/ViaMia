import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Compass, Users } from "lucide-react-native";
import { useSettings } from "../../src/settings-context";
import { FONT, RADIUS, useColors } from "./theme";

const SPRING = { stiffness: 400, damping: 32 };

function Card({ o, i, picked, onPress }) {
  const c = useColors();
  const isPicked = picked === o.id;
  const anim = useAnimatedStyle(() => ({
    opacity: withSpring(!picked || isPicked ? 1 : 0.35, SPRING),
    transform: [{ scale: withSpring(isPicked ? 1.02 : 1, SPRING) }],
  }));
  return (
    <Animated.View entering={FadeInDown.delay(140 + i * 80).springify()} style={anim}>
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ checked: isPicked }}
        style={{ padding: 20, gap: 8, borderRadius: RADIUS.card, borderWidth: isPicked ? 2 : 1, borderColor: isPicked ? c.accent : c.line, backgroundColor: c.card }}
      >
        <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: c.bg2 }}>
          <o.Icon color={c.accent} size={24} />
        </View>
        <Text style={{ fontFamily: FONT.heavy, fontSize: 19, color: c.ink }}>{o.title}</Text>
        <Text style={{ fontFamily: FONT.ui, fontSize: 14, lineHeight: 20, color: c.muted }}>{o.text}</Text>
        <Text style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: "hidden", backgroundColor: c.gold, fontFamily: FONT.bold, fontSize: 12, color: "#1E2638" }}>{o.tag}</Text>
      </Pressable>
    </Animated.View>
  );
}

// первый экран «как путешествуете?» — как src/Onboarding.jsx
export function Onboarding({ onPick }) {
  const { t } = useSettings();
  const c = useColors();
  const [picked, setPicked] = useState(null);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);

  const options = [
    { id: "self", Icon: Compass, title: t("onb.selfTitle"), text: t("onb.selfText"), tag: t("onb.selfTag") },
    { id: "guided", Icon: Users, title: t("onb.guidedTitle"), text: t("onb.guidedText"), tag: t("onb.guidedTag") },
  ];
  const pick = (id) => {
    if (picked) return;
    setPicked(id);
    timer.current = setTimeout(() => onPick(id), 280);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 16 }} accessibilityRole="radiogroup" accessibilityLabel={t("mode.label")}>
        <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 8, marginBottom: 8 }}>
          <Text style={{ fontFamily: FONT.bold, fontSize: 12, letterSpacing: 1, color: c.accent }}>{t("onb.kicker")}</Text>
          <Text style={{ fontFamily: FONT.display, fontSize: 34, lineHeight: 40, color: c.ink }}>{t("onb.title")}</Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 15, lineHeight: 22, color: c.muted }}>{t("onb.text")}</Text>
        </Animated.View>
        {options.map((o, i) => (
          <Card key={o.id} o={o} i={i} picked={picked} onPress={() => pick(o.id)} />
        ))}
      </View>
    </SafeAreaView>
  );
}
