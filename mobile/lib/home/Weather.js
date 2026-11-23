import { ScrollView, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, G, Path } from "react-native-svg";
import Animated, { FadeIn } from "react-native-reanimated";
import { Cloud, Droplets, RefreshCw, Sunrise, Sunset, Wind } from "lucide-react-native";
import { deg, sunInfo, updatedText, weatherKind } from "../../../src/home-data";
import { useSettings } from "../../../src/settings-context";
import { FONT, RADIUS, useColors } from "../theme";
import { enter } from "../motion";

// карточка погоды — как .wx в src/HomeBlocks.jsx/.css: днём тёплый градиент (--wx-day), ночью индиго,
// справа дуга солнца (ночью — луна), почасовой прогноз, внизу диапазон и ветер
export function Weather({ weather, now }) {
  const { t, fmtDuration } = useSettings();
  const c = useColors();
  const wx = weather.data;
  const { isDay, sunToday, shownRise, untilMin, sx, sy } = sunInfo(wx, now);
  const kind = wx ? weatherKind(wx.code, wx.isDay) : null;
  const nextText = wx ? t(isDay ? "wx.sunsetIn" : "wx.sunriseIn", { t: fmtDuration(Math.max(1, untilMin)) }) : "";
  const night = !isDay;
  const ink = night ? "#FFFFFF" : c.ink;
  const icon = night ? c.gold : c.accent;
  const grad = night ? ["#2a3350", "#1E2638", "#141a28"] : c.dark ? ["#2b2420", "#3a2a22", "#4a2e21"] : ["#fff7ef", "#fbe3d3", "#f6c9ae"];
  const txt = (size, weight, extra) => ({ fontFamily: weight === 800 ? FONT.heavy : weight === 700 ? FONT.bold : FONT.ui, fontSize: size, color: ink, ...extra });
  const Icon = kind?.Icon || Cloud;

  return (
    <Animated.View entering={enter(60)} style={{ borderRadius: RADIUS.card, overflow: "hidden", borderWidth: night ? 0 : 1, borderColor: c.line }}>
      <LinearGradient colors={grad} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.85, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={{ padding: 16, gap: 12 }}>
        {/* сейчас в Оше · обновлено … */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: -6, marginRight: -10, marginBottom: -8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: weather.failed ? c.muted : c.accent }} />
          <Text numberOfLines={1} style={txt(12, 600, { flex: 1, opacity: 0.75 })}>
            {weather.failed ? t("wx.offline") : t("wx.now")}
            {weather.at > 0 ? ` · ${updatedText(t, weather.at, now.getTime())}` : ""}
          </Text>
          <Pressable onPress={weather.refresh} disabled={weather.loading} accessibilityLabel={t("wx.refresh")} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: 0.75 }}>
            <RefreshCw color={ink} size={15} />
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 }}>
            <Animated.View key={kind ? `${wx.code}-${wx.isDay}` : "none"} entering={FadeIn.duration(300)}>
              <Icon color={icon} size={30} strokeWidth={1.8} />
            </Animated.View>
            <Text style={txt(38, 800, { letterSpacing: -1, lineHeight: 42 })}>{wx ? deg(wx.temp) : "—°"}</Text>
            <View style={{ flexShrink: 1 }}>
              <Text numberOfLines={2} style={txt(15, 800)}>{kind ? t(`wx.c.${kind.key}`) : t("wx.loading")}</Text>
              {wx && <Text style={txt(12, 700, { opacity: 0.7 })}>{t("wx.feels", { t: deg(wx.feels) })}</Text>}
            </View>
          </View>
          {/* дуга солнца */}
          <View style={{ width: 120 }}>
            <Svg width={120} height={64} viewBox="0 0 120 64" style={{ overflow: "visible" }}>
              <Path d="M10 58 A50 50 0 0 1 110 58" fill="none" stroke={ink} strokeOpacity={0.18} strokeWidth={2} strokeDasharray="3 5" />
              {wx && (
                <Path
                  d={`M10 58 A50 50 0 0 1 ${sx.toFixed(1)} ${sy.toFixed(1)}`}
                  fill="none"
                  stroke={night ? c.gold : c.accent}
                  strokeOpacity={night ? 0.55 : 1}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              )}
              {wx && isDay && <Circle cx={sx} cy={sy} r={6} fill={c.gold} stroke="#FFFFFF" strokeWidth={2} />}
              {wx && night && (
                <G transform={`translate(${sx.toFixed(1)} ${sy.toFixed(1)})`}>
                  <Path d="M1 -6 A6 6 0 1 0 1 6 A4.5 4.5 0 1 1 1 -6 Z" fill={c.gold} />
                </G>
              )}
            </Svg>
            {wx ? <Text numberOfLines={1} style={txt(11, 700, { textAlign: "center", opacity: 0.75, marginVertical: 2 })}>{nextText}</Text> : null}
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Sunrise color={ink} size={14} />
                <Text style={txt(12, 800)}>{shownRise ? shownRise.slice(11, 16) : "—"}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Sunset color={ink} size={14} />
                <Text style={txt(12, 800)}>{sunToday ? sunToday.set.slice(11, 16) : "—"}</Text>
              </View>
            </View>
          </View>
        </View>

        {wx?.hours?.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }} accessibilityLabel={t("wx.hourly")}>
            {wx.hours.map((h, i) => {
              const k = weatherKind(h.code, h.isDay);
              return (
                <Animated.View key={h.time} entering={enter(120 + i * 30, 220)} style={{ width: 52, alignItems: "center", gap: 4, paddingVertical: 8, borderRadius: 14, backgroundColor: night ? "rgba(255,255,255,0.08)" : c.glassLens }}>
                  <Text style={txt(11, 700, { opacity: 0.7 })}>{h.time.slice(11, 16)}</Text>
                  <k.Icon color={icon} size={18} strokeWidth={1.9} />
                  <Text style={txt(13, 800)}>{deg(h.temp)}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 1, opacity: h.rain >= 20 ? 1 : 0 }}>
                    <Droplets color={night ? c.gold : c.accent} size={10} />
                    <Text style={txt(11, 800, { color: night ? c.gold : c.accent })}>{`${h.rain}%`}</Text>
                  </View>
                </Animated.View>
              );
            })}
          </ScrollView>
        )}

        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, borderTopColor: night ? "rgba(255,255,255,0.14)" : c.dark ? "rgba(237,231,221,0.12)" : "rgba(30,38,56,0.12)", opacity: 0.85 }}>
          <Text style={txt(13, 700)}>{wx ? t("wx.range", { max: deg(wx.max), min: deg(wx.min) }) : "—"}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Wind color={ink} size={13} />
            <Text style={txt(13, 700)}>{wx ? t("wx.wind", { v: Math.round(wx.wind) }) : "—"}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
