import { useMemo, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useScrollToTop } from "expo-router";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { BadgeCheck, Search } from "lucide-react-native";
import { useSettings } from "../../../../src/settings-context";
import { useContent } from "../../../../src/content-context";
import { CATEGORIES } from "../../../../src/data";
import { agenciesOf } from "../../../../src/agencies";
import { TABBAR_SPACE } from "../../../lib/TabBar";
import { ChipRow, Segmented, TourCard } from "../../../lib/ui";
import { FONT, H, RADIUS, useColors } from "../../../lib/theme";

// появление карточки: лёгкий подъём, задержка по кругу из 6 (inView в src/components/shared.js)
const rise = (i) => FadeInDown.duration(300).delay((i % 6) * 50);

// агентства под списком «с гидом» — как AgencyBlock в src/views/ToursView.jsx
function AgencyBlock({ onPick }) {
  const { t, plural } = useSettings();
  const { tours } = useContent();
  const c = useColors();
  const agencies = useMemo(() => agenciesOf(tours), [tours]);
  if (agencies.length === 0) return null;
  const link = { fontFamily: FONT.heavy, fontSize: 13, color: c.accentDark };
  return (
    <View style={{ paddingTop: 4, paddingHorizontal: 16, paddingBottom: 24 }}>
      <Text style={{ fontFamily: FONT.display, fontSize: 17, color: c.ink, marginBottom: 12 }}>{t("home.agencies")}</Text>
      <View style={{ gap: 10 }}>
        {agencies.map((a, i) => (
          <Animated.View key={a.name} entering={rise(i)} style={{ flexDirection: "row", gap: 12, padding: 14, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
            {a.logo ? (
              <Image source={a.logo} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.bg2 }} contentFit="cover" />
            ) : (
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.solid, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: FONT.display, fontSize: 22, color: c.onSolid }}>{a.name.slice(0, 1)}</Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontFamily: FONT.heavy, fontSize: 15, color: c.ink }}>{a.name}</Text>
                {a.verified && <BadgeCheck color={c.success} size={15} accessibilityLabel={t("label.verified")} />}
              </View>
              <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: c.muted }}>{t("home.agencyTours", { n: plural("pl.tours", a.count) })}</Text>
              <View style={{ flexDirection: "row", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
                <Pressable onPress={() => onPick(a.name)} hitSlop={8}>
                  <Text style={link}>{t("home.agencyOpen")}</Text>
                </Pressable>
                {a.site && (
                  <Pressable onPress={() => Linking.openURL(a.site)} hitSlop={8}>
                    <Text style={link}>{a.site.replace(/^https?:\/\//, "")} ↗</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

// каталог — та же логика и порядок, что в src/views/ToursView.jsx: поиск, «сам / с гидом», чипы, карточки
export default function ToursScreen() {
  const { t, loc, travelMode, setTravelMode } = useSettings();
  const { tours, selfTours } = useContent();
  const c = useColors();
  const scroll = useRef(null);
  useScrollToTop(scroll);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const pool = travelMode === "guided" ? tours : selfTours;
  const cats = CATEGORIES.filter((x) => x.id === "all" || pool.some((e) => e.category === x.id));
  const active = cats.some((x) => x.id === category) ? category : "all";
  const q = query.trim().toLowerCase();
  const list = pool.filter((raw) => {
    if (active !== "all" && raw.category !== active) return false;
    if (!q) return true;
    const e = loc(raw);
    return `${e.title} ${e.place} ${e.type} ${raw.title} ${raw.place} ${raw.type} ${raw.agencyName || ""}`
      .toLowerCase()
      .includes(q);
  });
  const open = (item) => router.push(`/tour/${encodeURIComponent(item.id)}`);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView ref={scroll} stickyHeaderIndices={[1]} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: TABBAR_SPACE + 16 }}>
        <View style={{ paddingTop: 14, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, height: H.btn, paddingHorizontal: 14, borderRadius: RADIUS.btn, borderWidth: 1, borderColor: c.line, backgroundColor: c.bg }}>
            <Search color={c.muted2} size={18} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("tours.search")}
              placeholderTextColor={c.muted}
              returnKeyType="search"
              style={{ flex: 1, fontFamily: FONT.ui, fontSize: 15, color: c.ink, padding: 0 }}
            />
          </View>
        </View>

        <View style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: c.bg, borderBottomWidth: 1, borderColor: c.line }}>
          <Segmented
            label={t("mode.label")}
            value={travelMode}
            onChange={setTravelMode}
            options={[
              { value: "self", label: t("mode.self") },
              { value: "guided", label: t("mode.guided") },
            ]}
          />
        </View>

        <View style={{ marginTop: 12 }}>
          <ChipRow items={cats} value={active} onChange={setCategory} />
        </View>

        <View key={`${travelMode}-${active}-${q}`} style={{ paddingHorizontal: 16, paddingBottom: 20, marginTop: 4, gap: 14 }}>
          {list.length === 0 && (
            <Animated.View entering={ZoomIn.springify().stiffness(400).damping(32)} style={{ alignItems: "center", gap: 6, padding: 24, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
              <Search color={c.ink} size={32} />
              <Text style={{ fontFamily: FONT.heavy, fontSize: 15, color: c.ink }}>{t("tours.emptyTitle")}</Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: c.muted, textAlign: "center" }}>{t("tours.emptyText")}</Text>
            </Animated.View>
          )}
          {list.map((item, i) => (
            <Animated.View key={item.id} entering={rise(i)}>
              <TourCard item={item} onPress={() => open(item)} />
            </Animated.View>
          ))}
        </View>

        {travelMode === "guided" && (
          <AgencyBlock
            onPick={(name) => {
              setCategory("all");
              setQuery(name);
              scroll.current?.scrollTo({ y: 0, animated: true });
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
