import { useRef, useState } from "react";
import { useScrollToTop } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { TABBAR_SPACE } from "../../../lib/TabBar";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search } from "lucide-react-native";
import { useSettings } from "../../../../src/settings-context";
import { useContent } from "../../../../src/content-context";
import { CATEGORIES } from "../../../../src/data";
import { Empty, Segmented, TourCard } from "../../../lib/ui";
import { FONT, H, RADIUS, useColors } from "../../../lib/theme";

// каталог — та же логика, что в src/views/ToursView.jsx
export default function ToursScreen() {
  const { t, loc, travelMode, setTravelMode } = useSettings();
  const { tours, selfTours } = useContent();
  const c = useColors();
  const scroll = useRef(null);
  useScrollToTop(scroll);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const pool = travelMode === "self" ? selfTours : tours;
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

  const header = (
    <View style={{ gap: 14, paddingBottom: 6 }}>
      <Text style={{ fontFamily: FONT.bold, fontSize: 12, letterSpacing: 1, color: c.muted }}>{t("tours.kicker")}</Text>
      <Text style={{ fontFamily: FONT.display, fontSize: 30, color: c.ink }}>{t("tours.title")}</Text>
      <Segmented
        label={t("mode.label")}
        value={travelMode}
        onChange={setTravelMode}
        options={[
          { value: "self", label: t("mode.self") },
          { value: "guided", label: t("mode.guided") },
        ]}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: H.btn, paddingHorizontal: 14, borderRadius: RADIUS.btn, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
        <Search color={c.muted} size={18} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("tours.search")}
          placeholderTextColor={c.muted}
          style={{ flex: 1, fontFamily: FONT.ui, fontSize: 15, color: c.ink }}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {cats.map((cat) => {
          const on = cat.id === active;
          return (
            <Pressable
              key={cat.id}
              onPress={() => setCategory(cat.id)}
              accessibilityState={{ selected: on }}
              style={{ height: H.chip, borderRadius: RADIUS.chip, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: on ? c.solid : c.card, borderWidth: 1, borderColor: on ? c.solid : c.line }}
            >
              <cat.Icon color={on ? c.onSolid : c.ink} size={16} />
              <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: on ? c.onSolid : c.ink }}>{loc(cat).label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        ref={scroll}
        data={list}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: TABBAR_SPACE + 16 }}
        ListEmptyComponent={<Empty title={t("tours.emptyTitle")} text={t("tours.emptyText")} />}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 60).springify()}>
            <TourCard item={item} onPress={() => router.push(`/tour/${encodeURIComponent(item.id)}`)} />
          </Animated.View>
        )}
      />
    </SafeAreaView>
  );
}
