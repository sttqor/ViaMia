import { useState } from "react";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BadgeCheck, Search } from "lucide-react-native";
import { useSettings } from "../../../../src/settings-context";
import { useContent } from "../../../../src/content-context";
import { CATEGORIES } from "../../../../src/data";
import { durationMinutes } from "../../../../src/i18n";
import { priceText } from "../../../../src/components/shared";
import { FONT, H, RADIUS, useColors } from "../../../lib/theme";

// каталог — та же логика, что в src/views/ToursView.jsx
export default function ToursScreen() {
  const { t, loc, money, fmtDuration, travelMode } = useSettings();
  const { tours, selfTours } = useContent();
  const c = useColors();
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
        data={list}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 16, gap: 14 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 6 }}>
            <Text style={{ fontFamily: FONT.bold, fontSize: 17, color: c.ink }}>{t("tours.emptyTitle")}</Text>
            <Text style={{ fontFamily: FONT.ui, color: c.muted, textAlign: "center" }}>{t("tours.emptyText")}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const e = loc(item);
          return (
            <Link href={`/tour/${encodeURIComponent(item.id)}`} asChild>
              <Pressable style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, overflow: "hidden" }}>
                <Image source={item.image} style={{ height: 180 }} contentFit="cover" transition={200} />
                <View style={{ padding: 14, gap: 4 }}>
                  <Text style={{ fontFamily: FONT.bold, fontSize: 12, color: c.muted }}>
                    {[e.type, e.place, fmtDuration(durationMinutes(item.duration))].filter(Boolean).join(" · ")}
                  </Text>
                  <Text style={{ fontFamily: FONT.heavy, fontSize: 17, color: c.ink }}>{e.title}</Text>
                  {item.agencyName ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      {item.agencyVerified && <BadgeCheck color={c.success} size={14} />}
                      <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: c.muted }}>{item.agencyName}</Text>
                    </View>
                  ) : null}
                  <Text style={{ fontFamily: FONT.heavy, fontSize: 15, color: c.accent, marginTop: 4 }}>{priceText(item, t, money)}</Text>
                </View>
              </Pressable>
            </Link>
          );
        }}
      />
    </SafeAreaView>
  );
}
