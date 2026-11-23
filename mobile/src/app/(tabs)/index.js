import { useEffect, useRef, useState } from "react";
import { AppState, Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { router, useScrollToTop } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Speech from "expo-speech";
import Animated, { FadeIn, FadeInDown, SlideInDown } from "react-native-reanimated";
import { ChevronRight, Languages, Lightbulb, Map as MapIcon, Phone, X } from "lucide-react-native";
import { OSH, SOS, toRussianSounds, useOshWeather } from "../../../../src/home-data";
import { useSettings } from "../../../../src/settings-context";
import { BellButton, IconButton } from "../../../lib/ui";
import { PhraseStack } from "../../../lib/PhraseStack";
import { TABBAR_SPACE } from "../../../lib/TabBar";
import { Weather } from "../../../lib/home/Weather";
import { FactStory } from "../../../lib/home/FactStory";
import { FONT, RADIUS, useColors } from "../../../lib/theme";

const DANGER = "#C8102E";

// голос для кыргызской фразы: ky → kk → ru (как useSpeak в src/HomeBlocks.jsx)
let voicePick = null;
async function speakKy(text, onDone) {
  voicePick ??= Speech.getAvailableVoicesAsync()
    .then((vs) => {
      const by = (re) => vs.find((v) => re.test(v.language));
      const native = by(/^ky/i) || by(/^kk/i);
      return native ? { voice: native, native: true } : { voice: by(/^ru/i), native: false };
    })
    .catch(() => ({ native: false }));
  const { voice, native } = await voicePick;
  Speech.stop();
  Speech.speak(native ? text : toRussianSounds(text), {
    voice: voice?.identifier,
    language: voice?.language || "ru-RU",
    rate: 0.82,
    onDone,
    onStopped: onDone,
    onError: onDone,
  });
}

// главная — как src/views/HomeView.jsx: «Ош» и погода, сторис фактов, быстрые кнопки, фразы, SOS
export default function HomeScreen() {
  const { t, locale } = useSettings();
  const c = useColors();
  const scroll = useRef(null);
  useScrollToTop(scroll);
  const weather = useOshWeather();
  const [now, setNow] = useState(() => new Date());
  const [speaking, setSpeaking] = useState(null);
  const [sosOpen, setSosOpen] = useState(false);
  const [soon, setSoon] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);
  // вернулись в приложение — свежие время и погода (на сайте это visibilitychange)
  const refreshWx = useRef(weather.refresh);
  useEffect(() => {
    refreshWx.current = weather.refresh;
  });
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      if (st !== "active") return;
      setNow(new Date());
      refreshWx.current();
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!soon) return;
    const id = setTimeout(() => setSoon(false), 2200);
    return () => clearTimeout(id);
  }, [soon]);

  const dateText = new Intl.DateTimeFormat(locale, { timeZone: OSH.tz, weekday: "long", day: "numeric", month: "long" }).format(now);
  const timeText = new Intl.DateTimeFormat(locale, { timeZone: OSH.tz, hour: "2-digit", minute: "2-digit" }).format(now);
  const quick = [
    { id: "translator", Icon: Languages, label: t("quick.translator"), soon: true, onPress: () => setSoon(true) },
    { id: "tips", Icon: Lightbulb, label: t("quick.tips"), onPress: () => router.push("/tips") },
    { id: "map", Icon: MapIcon, label: t("quick.map"), onPress: () => router.navigate("/map") },
  ];

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: TABBAR_SPACE + 16 }}>
        <Animated.View entering={FadeInDown.duration(350)} style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONT.display, fontSize: 40, lineHeight: 46, color: c.ink }}>{t("home.city")}</Text>
            <Text style={{ fontFamily: FONT.bold, fontSize: 13, color: c.muted }}>{`${dateText.charAt(0).toUpperCase()}${dateText.slice(1)} · ${timeText}`}</Text>
          </View>
          <BellButton />
        </Animated.View>

        <Weather weather={weather} now={now} />

        <Animated.View entering={FadeInDown.delay(140).springify()}>
          <FactStory />
        </Animated.View>

        {/* быстрые кнопки */}
        <View style={{ flexDirection: "row", paddingTop: 4 }}>
          {quick.map((q, i) => (
            <Animated.View key={q.id} entering={FadeInDown.delay(200 + i * 60).springify()} style={{ flex: 1, alignItems: "center" }}>
              <Pressable onPress={q.onPress} style={({ pressed }) => ({ alignItems: "center", gap: 8, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
                <View style={{ width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
                  <q.Icon color={c.ink} size={22} />
                  {q.soon && (
                    <Text style={{ position: "absolute", top: -6, right: -10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, overflow: "hidden", backgroundColor: c.gold, fontFamily: FONT.heavy, fontSize: 11, color: "#1E2638" }}>{t("quick.soonBadge")}</Text>
                  )}
                </View>
                <Text style={{ fontFamily: FONT.bold, fontSize: 13, color: c.ink }}>{q.label}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* фразы на кыргызском — стопка со свайпом */}
        <Animated.View entering={FadeInDown.delay(260).springify()}>
          <PhraseStack
            speaking={speaking}
            speak={(i, text) => {
              setSpeaking(i);
              speakKy(text, () => setSpeaking((s) => (s === i ? null : s)));
            }}
          />
        </Animated.View>

        {/* SOS */}
        <Pressable
          onPress={() => setSosOpen(true)}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 76, paddingVertical: 14, paddingHorizontal: 16, borderRadius: RADIUS.card, backgroundColor: DANGER, shadowColor: DANGER, shadowOpacity: 0.28, shadowRadius: 13, shadowOffset: { width: 0, height: 10 }, elevation: 6, transform: [{ scale: pressed ? 0.98 : 1 }] })}
        >
          <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.22)" }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
              <Text style={{ fontFamily: FONT.heavy, fontSize: 15, letterSpacing: 0.6, color: DANGER }}>SOS</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONT.heavy, fontSize: 16, color: "#FFFFFF" }}>{t("sos.cardTitle")}</Text>
            <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: "rgba(255,255,255,0.88)" }}>{t("sos.cardText")}</Text>
          </View>
          <ChevronRight color="#FFFFFF" size={20} />
        </Pressable>
      </ScrollView>

      {soon && (
        <Animated.Text entering={FadeIn} style={{ position: "absolute", left: 16, right: 16, bottom: TABBAR_SPACE + 12, padding: 12, borderRadius: 14, overflow: "hidden", backgroundColor: c.indigo, color: "#FFFFFF", fontFamily: FONT.bold, textAlign: "center" }}>
          {t("quick.soon")}
        </Animated.Text>
      )}

      {/* лист SOS */}
      <Modal visible={sosOpen} transparent animationType="fade" onRequestClose={() => setSosOpen(false)}>
        <Pressable onPress={() => setSosOpen(false)} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(20,26,40,0.5)" }}>
          <Animated.View entering={SlideInDown.springify().damping(32).stiffness(400)}>
            <Pressable onPress={() => {}} accessibilityViewIsModal style={{ padding: 16, paddingBottom: 32, gap: 10, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: c.card }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ flex: 1, fontFamily: FONT.heavy, fontSize: 18, color: c.ink }}>{t("sos.title")}</Text>
                <IconButton label={t("facts.close")} onPress={() => setSosOpen(false)}>
                  <X color={c.ink} size={18} />
                </IconButton>
              </View>
              <Pressable onPress={() => Linking.openURL("tel:112")} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: RADIUS.card, backgroundColor: DANGER }}>
                <Phone color="#FFFFFF" size={22} />
                <View>
                  <Text style={{ fontFamily: FONT.heavy, fontSize: 22, color: "#FFFFFF" }}>112</Text>
                  <Text style={{ fontFamily: FONT.ui, color: "rgba(255,255,255,0.88)" }}>{t("sos.112")}</Text>
                </View>
              </Pressable>
              {SOS.slice(1).map((s) => (
                <Pressable key={s.num} onPress={() => Linking.openURL(`tel:${s.num}`)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line }}>
                  <Text style={{ width: 44, fontFamily: FONT.heavy, fontSize: 18, color: DANGER }}>{s.num}</Text>
                  <Text style={{ flex: 1, fontFamily: FONT.ui, color: c.ink }}>{t(s.key)}</Text>
                  <Phone color={c.ink} size={16} />
                </Pressable>
              ))}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
