import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react-native";
import { useSettings } from "../../../../src/settings-context";
import { durationMinutes } from "../../../../src/i18n";
import { distKm } from "../../../../src/routing";
import { useStore } from "../../../lib/store";
import { Button, Empty, IconButton } from "../../../lib/ui";
import { FONT, RADIUS, useColors } from "../../../lib/theme";

const WALK_KMH = 4.5;
const walkKm = (a, b) => distKm([a.lng, a.lat], [b.lng, b.lat]) * 1.3; // поправка на улицы — как в src/views/RouteView.jsx

// маршрут дня: список, порядок, итоги; карта и навигатор — следующим шагом
export default function RouteScreen() {
  const { t, loc, fmtDuration, locale } = useSettings();
  const { routeItems: items, setRouteIds } = useStore();
  const c = useColors();

  const legs = items.map((it, i) => (i === 0 ? 0 : walkKm(items[i - 1], it)));
  const totalKm = legs.reduce((a, b) => a + b, 0);
  const totalMin = items.reduce((a, it) => a + durationMinutes(it.duration), 0) + (totalKm / WALK_KMH) * 60;
  const fmtKm = (km) => t("unit.km", { n: km.toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) });

  const ids = items.map((x) => x.id);
  const move = (i, d) => {
    const next = [...ids];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setRouteIds(next);
  };
  const remove = (id) => setRouteIds(ids.filter((x) => x !== id));

  const stat = (label, value) => (
    <View style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
      <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: c.muted }}>{label}</Text>
      <Text style={{ fontFamily: FONT.heavy, fontSize: 17, color: c.ink, marginTop: 2 }}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={{ fontFamily: FONT.bold, fontSize: 12, letterSpacing: 1, color: c.muted }}>{t("route.kicker")}</Text>
        <Text style={{ fontFamily: FONT.display, fontSize: 30, color: c.ink }}>{t("route.title")}</Text>
        <Text style={{ fontFamily: FONT.ui, fontSize: 15, lineHeight: 21, color: c.muted }}>{t("route.subtitle")}</Text>

        {items.length === 0 ? (
          <Empty title={t("route.emptyTitle")} text={t("route.emptyText")} action={t("route.goTours")} onAction={() => router.navigate("/tours")} />
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {stat(t("route.walk"), fmtKm(totalKm))}
              {stat(t("route.time"), fmtDuration(Math.round(totalMin)))}
              {stat(t("route.points"), String(items.length))}
            </View>
            <Text style={{ fontFamily: FONT.heavy, fontSize: 17, color: c.ink, marginTop: 6 }}>{t("route.listTitle")}</Text>
            {items.map((raw, i) => {
              const e = loc(raw);
              return (
                <View key={raw.id} style={{ gap: 6 }}>
                  {i > 0 && (
                    <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: c.muted, marginLeft: 44 }}>
                      {t("route.leg", { dist: fmtKm(legs[i]) })}
                    </Text>
                  )}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontFamily: FONT.heavy, color: "#FFFFFF" }}>{i + 1}</Text>
                    </View>
                    <Pressable style={{ flex: 1 }} onPress={() => router.push(`/tour/${encodeURIComponent(raw.id)}`)}>
                      <Text style={{ fontFamily: FONT.heavy, fontSize: 15, color: c.ink }}>{e.title}</Text>
                      <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: c.muted }}>
                        {[e.place, fmtDuration(durationMinutes(raw.duration))].filter(Boolean).join(" · ")}
                      </Text>
                    </Pressable>
                    {i > 0 && (
                      <IconButton label={t("route.up")} onPress={() => move(i, -1)}>
                        <ChevronUp color={c.ink} size={18} />
                      </IconButton>
                    )}
                    {i < items.length - 1 && (
                      <IconButton label={t("route.down")} onPress={() => move(i, 1)}>
                        <ChevronDown color={c.ink} size={18} />
                      </IconButton>
                    )}
                    <IconButton label={t("route.remove")} onPress={() => remove(raw.id)}>
                      <Trash2 color={c.accent} size={18} />
                    </IconButton>
                  </View>
                </View>
              );
            })}
            <Button secondary title={t("route.addPlace")} onPress={() => router.navigate("/tours")} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
