import { useEffect } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeInDown, SlideInDown, useAnimatedStyle, useSharedValue, withTiming, Easing } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Clock, Globe, Map as MapIcon, MapPin, Users } from "lucide-react-native";
import { useSettings } from "../../../../src/settings-context";
import { useContent } from "../../../../src/content-context";
import { durationMinutes } from "../../../../src/i18n";
import { twoGisPlace } from "../../../../src/twogis";
import { FONT, RADIUS, useColors } from "../../../lib/theme";
import { useStore } from "../../../lib/store";
import { BackButton, Button, ModeLabel, SaveButton, StarRow } from "../../../lib/ui";

const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
// текст появляется по очереди (STAGGER / RISE в src/components/shared.js)
const rise = (i) => FadeInDown.duration(350).delay(80 + i * 60).easing(EASE_OUT);

// экран тура — как src/views/Detail.jsx; мини-карту заменяет кнопка «Открыть в 2ГИС»
export default function TourScreen() {
  const { id } = useLocalSearchParams();
  const { byId } = useContent();
  const { t, loc, money, plural, fmtDuration } = useSettings();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { saved, routeIds, toggleSave, toggleRoute } = useStore();
  // фото обложки чуть «оседает» при открытии (HERO_IMG)
  const zoom = useSharedValue(1.08);
  useEffect(() => {
    zoom.set(withTiming(1, { duration: 1100, easing: EASE_OUT }));
  }, [zoom]);
  const heroStyle = useAnimatedStyle(() => ({ transform: [{ scale: zoom.value }] }));

  const raw = byId(String(id));
  if (!raw) return null;
  const exp = loc(raw);
  const self = !!raw.selfGuided;
  const inRoute = routeIds.includes(raw.id);

  const bold = { fontFamily: FONT.heavy, fontSize: 16, color: c.ink };
  const soft = { fontFamily: FONT.ui, fontSize: 15, lineHeight: 22.5, color: c.inkSoft };
  const muted = { fontFamily: FONT.ui, fontSize: 13, color: c.muted };
  const chip = (Icon, text, green) => (
    <View key={text} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.chip, backgroundColor: green ? c.successBg : c.bg2 }}>
      {Icon && <Icon color={green ? c.success : c.inkSoft} size={13} />}
      <Text style={{ fontFamily: FONT.bold, fontSize: 13, color: green ? c.success : c.inkSoft }}>{text}</Text>
    </View>
  );
  let n = 0; // порядок появления блоков

  return (
    <View style={{ flex: 1, backgroundColor: c.card }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        <View style={{ height: 240 + insets.top, overflow: "hidden", backgroundColor: c.bg2 }}>
          <Animated.View style={[{ flex: 1 }, heroStyle]}>
            <Image source={exp.image} style={{ flex: 1 }} contentFit="cover" />
          </Animated.View>
        </View>
        <View style={{ padding: 16 }}>
          <Animated.Text entering={rise(n++)} style={{ fontFamily: FONT.bold, fontSize: 11, letterSpacing: 0.22, color: c.muted, marginBottom: 4 }}>
            {`${exp.type} · ${exp.place}`}
          </Animated.Text>
          <Animated.Text entering={rise(n++)} style={{ fontFamily: FONT.display, fontSize: 22, lineHeight: 27.5, color: c.ink, marginTop: 4, marginBottom: 10 }}>
            {exp.title}
          </Animated.Text>
          <Animated.View entering={rise(n++)} style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 12, alignItems: "center" }}>
            <StarRow rating={exp.rating} />
            {exp.reviews > 0 && <Text style={muted}>{plural("pl.reviews", exp.reviews)}</Text>}
            <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
              <Clock color={c.muted} size={14} />
              <Text style={muted}>{fmtDuration(durationMinutes(exp.duration))}</Text>
            </View>
          </Animated.View>
          <Animated.View entering={rise(n++)} style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {exp.freeCancel && chip(null, t("detail.freeCancel"), true)}
            {exp.group && chip(Users, exp.group)}
            {exp.lang && chip(Globe, exp.lang)}
          </Animated.View>
          <Animated.Text entering={rise(n++)} style={[soft, { marginBottom: 16 }]}>{exp.description}</Animated.Text>
          {exp.highlights?.length > 0 && (
            <>
              <Text style={bold}>{t("detail.whatsOn")}</Text>
              <View style={{ marginTop: 8, marginBottom: 16, gap: 8 }}>
                {exp.highlights.map((x) => (
                  <View key={x} style={{ flexDirection: "row", gap: 8 }}>
                    <Check color={c.accent} size={15} style={{ marginTop: 3 }} />
                    <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 16, lineHeight: 22.4, color: c.ink }}>{x}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          {exp.includes?.length > 0 && (
            <>
              <Text style={bold}>{t("detail.includes")}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8, marginBottom: 16 }}>{exp.includes.map((x) => chip(null, x))}</View>
            </>
          )}
          {!self && exp.agencyName ? (
            <Animated.View entering={rise(n++)} style={{ marginBottom: 16, padding: 14, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                {raw.agencyLogo ? (
                  <Image source={raw.agencyLogo} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.bg2 }} contentFit="cover" />
                ) : (
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.solid, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: FONT.display, fontSize: 22, color: c.onSolid }}>{exp.agencyName.slice(0, 1)}</Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: c.muted }}>{t("detail.organizer")}</Text>
                  <Text style={{ fontFamily: FONT.heavy, fontSize: 15, color: c.ink }}>{exp.agencyName}</Text>
                </View>
                {raw.agencyVerified && <ModeLabel self verified>{t("label.verified")}</ModeLabel>}
              </View>
              <Text style={[muted, { marginTop: 8 }]}>{t(raw.agencyVerified ? "detail.verifiedText" : "detail.fromSite")}</Text>
            </Animated.View>
          ) : null}
          {!self && (
            <Animated.View entering={rise(n)} style={{ marginBottom: 16 }}>
              <Text style={bold}>{t("detail.howTitle")}</Text>
              <View style={{ marginTop: 8, gap: 8 }}>
                {[t("detail.how1"), t("detail.how2"), t(exp.freeCancel ? "detail.how3cancel" : "detail.how3")].map((s, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.accentGlow, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontFamily: FONT.heavy, fontSize: 11, color: c.accentDark }}>{i + 1}</Text>
                    </View>
                    <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 13, lineHeight: 18.85, color: c.inkSoft }}>{s}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <MapPin color={c.ink} size={16} />
            <Text style={bold}>{t(self ? "detail.start" : "detail.meeting")}</Text>
          </View>
          <Text style={[muted, { marginBottom: 12 }]}>{exp.meeting}</Text>
          {exp.lat != null && exp.lng != null && (
            <Button secondary icon={<MapIcon color={c.ink} size={16} />} title={t("map.poi.open2gis")} onPress={() => Linking.openURL(twoGisPlace(exp.lat, exp.lng))} />
          )}
          {!self && exp.url ? (
            <Pressable onPress={() => Linking.openURL(exp.url)} hitSlop={8} style={{ marginTop: 12 }}>
              <Text style={{ fontFamily: FONT.heavy, fontSize: 13, color: c.accentDark }}>{`${t("detail.agencySite", { name: exp.agencyName || "" })} →`}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <SafeAreaView edges={["top"]} style={{ position: "absolute", left: 12, right: 12, top: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <BackButton />
        <SaveButton saved={saved.has(raw.id)} onPress={() => toggleSave(raw.id)} />
      </SafeAreaView>

      <Animated.View
        entering={SlideInDown.springify().stiffness(400).damping(32).delay(150)}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, overflow: "hidden", borderTopWidth: 1, borderColor: c.line }}
      >
        <BlurView intensity={40} tint={c.dark ? "dark" : "light"} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        <View style={{ backgroundColor: c.glass, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 + insets.bottom }}>
          <View>
            {self ? (
              <Text style={{ fontFamily: FONT.heavy, fontSize: 22, color: c.ink }}>{t("price.free")}</Text>
            ) : exp.price == null ? (
              <Text style={{ fontFamily: FONT.heavy, fontSize: 15, color: c.ink }}>{t("price.request")}</Text>
            ) : (
              <>
                <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: c.muted }}>{t("common.from")}</Text>
                <Text style={{ fontFamily: FONT.heavy, fontSize: 22, color: c.ink }}>{money(exp.price)}</Text>
              </>
            )}
          </View>
          <View style={{ flex: 1 }}>
            {self ? (
              <Button ticker title={t(inRoute ? "card.inRoute" : "card.addRoute")} onPress={() => toggleRoute(raw.id)} />
            ) : (
              <Button title={t("detail.pickDate")} onPress={() => router.push(`/book/${encodeURIComponent(raw.id)}`)} />
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
