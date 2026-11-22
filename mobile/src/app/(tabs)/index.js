import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Speech from "expo-speech";
import { ChevronRight, Droplets, Phone, Sunrise, Sunset, Volume2, Wind } from "lucide-react-native";
import { fallbackOf } from "../../../../src/i18n";
import { OSH, PHRASES, SOS, deg, toRussianSounds, updatedText, useOshWeather, weatherKind } from "../../../../src/home-data";
import { useSettings } from "../../../../src/settings-context";
import { useContent } from "../../../../src/content-context";
import { BellButton, IconButton } from "../../../lib/ui";
import { FONT, RADIUS, useColors } from "../../../lib/theme";

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

// главная — как src/views/HomeView.jsx: погода Оша, факты, фразы, SOS
export default function HomeScreen() {
  const { t, loc, lang, locale } = useSettings();
  const { facts } = useContent();
  const c = useColors();
  const weather = useOshWeather();
  const wx = weather.data;
  const [now, setNow] = useState(() => new Date());
  const [speaking, setSpeaking] = useState(null);
  const [sosOpen, setSosOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const dateText = new Intl.DateTimeFormat(locale, { timeZone: OSH.tz, weekday: "long", day: "numeric", month: "long" }).format(now);
  const timeText = new Intl.DateTimeFormat(locale, { timeZone: OSH.tz, hour: "2-digit", minute: "2-digit" }).format(now);
  const kind = wx ? weatherKind(wx.code, wx.isDay) : null;
  const card = { padding: 16, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, gap: 10 };
  const small = { fontFamily: FONT.ui, fontSize: 13, color: c.muted };
  const h2 = { fontFamily: FONT.heavy, fontSize: 18, color: c.ink };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONT.display, fontSize: 40, color: c.ink }}>{t("home.city")}</Text>
            <Text style={small}>{`${dateText} · ${timeText}`}</Text>
          </View>
          <BellButton />
        </View>

        {/* погода */}
        <Pressable onPress={weather.refresh} accessibilityLabel={t("wx.refresh")} style={card}>
          <Text style={small}>
            {weather.failed ? t("wx.offline") : t("wx.now")}
            {weather.at > 0 ? ` · ${updatedText(t, weather.at, now.getTime())}` : ""}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {kind && <kind.Icon color={c.accent} size={40} />}
            <Text style={{ fontFamily: FONT.heavy, fontSize: 44, color: c.ink }}>{wx ? deg(wx.temp) : "—°"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT.bold, fontSize: 15, color: c.ink }}>{kind ? t(`wx.c.${kind.key}`) : t("wx.loading")}</Text>
              {wx && <Text style={small}>{t("wx.feels", { t: deg(wx.feels) })}</Text>}
            </View>
          </View>
          {wx?.hours?.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }} accessibilityLabel={t("wx.hourly")}>
              {wx.hours.map((h) => {
                const k = weatherKind(h.code, h.isDay);
                return (
                  <View key={h.time} style={{ alignItems: "center", gap: 4 }}>
                    <Text style={small}>{h.time.slice(11, 16)}</Text>
                    <k.Icon color={c.ink} size={18} />
                    <Text style={{ fontFamily: FONT.bold, color: c.ink }}>{deg(h.temp)}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 2, opacity: h.rain >= 20 ? 1 : 0.4 }}>
                      <Droplets color={c.muted} size={10} />
                      <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: c.muted }}>{`${h.rain}%`}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
          <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <Text style={small}>{wx ? t("wx.range", { max: deg(wx.max), min: deg(wx.min) }) : "—"}</Text>
            {wx?.sun?.[0] && (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Sunrise color={c.muted} size={13} />
                  <Text style={small}>{wx.sun[0].rise.slice(11, 16)}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Sunset color={c.muted} size={13} />
                  <Text style={small}>{wx.sun[0].set.slice(11, 16)}</Text>
                </View>
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Wind color={c.muted} size={13} />
              <Text style={small}>{wx ? t("wx.wind", { v: Math.round(wx.wind) }) : "—"}</Text>
            </View>
          </View>
        </Pressable>

        {/* факты */}
        {facts.length > 0 && (
          <>
            <Text style={h2}>{t("facts.title")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {facts.map((raw) => {
                const f = loc(raw);
                return (
                  <Pressable key={raw.id} onPress={() => router.push(`/fact/${encodeURIComponent(raw.id)}`)} style={{ width: 260, borderRadius: RADIUS.card, overflow: "hidden", backgroundColor: c.indigo }}>
                    <Image source={f.image} style={{ height: 140, backgroundColor: c.bg2 }} contentFit="cover" />
                    <View style={{ padding: 14, gap: 6 }}>
                      {f.tag ? <Text style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: "hidden", backgroundColor: c.gold, fontFamily: FONT.bold, fontSize: 11, color: "#1E2638" }}>{f.tag}</Text> : null}
                      <Text style={{ fontFamily: FONT.display, fontSize: 19, color: "#FFFFFF" }}>{f.title}</Text>
                      <Text style={{ fontFamily: FONT.ui, fontSize: 13, lineHeight: 18, color: "#FFFFFF", opacity: 0.8 }} numberOfLines={3}>{f.short}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* фразы на кыргызском */}
        <Text style={h2}>{t("phrase.kicker")}</Text>
        {PHRASES.map((p, i) => {
          const translation = (lang !== "ky" && p[lang]) || p[fallbackOf(lang)];
          const sound = p.tr[lang] || p.tr[fallbackOf(lang)];
          return (
            <View key={p.ky} style={[card, { flexDirection: "row", alignItems: "center" }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: FONT.heavy, fontSize: 17, color: c.ink }}>{p.ky}</Text>
                <Text style={small}>{`[${sound}] · ${translation}`}</Text>
              </View>
              <IconButton
                label={t("phrase.listen")}
                onPress={() => {
                  setSpeaking(i);
                  speakKy(p.ky, () => setSpeaking((s) => (s === i ? null : s)));
                }}
              >
                <Volume2 color={speaking === i ? c.accent : c.ink} size={20} />
              </IconButton>
            </View>
          );
        })}

        {/* SOS */}
        <Pressable onPress={() => setSosOpen((o) => !o)} style={[card, { flexDirection: "row", alignItems: "center" }]}>
          <Text style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, overflow: "hidden", backgroundColor: c.accent, fontFamily: FONT.heavy, color: "#FFFFFF" }}>SOS</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONT.heavy, fontSize: 15, color: c.ink }}>{t("sos.cardTitle")}</Text>
            <Text style={small}>{t("sos.cardText")}</Text>
          </View>
          <ChevronRight color={c.muted} size={20} style={{ transform: [{ rotate: sosOpen ? "90deg" : "0deg" }] }} />
        </Pressable>
        {sosOpen &&
          SOS.map((s) => (
            <Pressable key={s.num} onPress={() => Linking.openURL(`tel:${s.num}`)} style={[card, { flexDirection: "row", alignItems: "center", paddingVertical: 12 }]}>
              <Text style={{ width: 48, fontFamily: FONT.heavy, fontSize: 18, color: c.accent }}>{s.num}</Text>
              <Text style={{ flex: 1, fontFamily: FONT.ui, color: c.ink }}>{t(s.key)}</Text>
              <Phone color={c.ink} size={16} />
            </Pressable>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}
