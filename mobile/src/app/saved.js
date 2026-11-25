import { FlatList, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../../../src/settings-context";
import { useContent } from "../../../src/content-context";
import { useStore } from "../../lib/store";
import { BackButton, Button, Empty, TourCard } from "../../lib/ui";
import { FONT, useColors } from "../../lib/theme";

// избранное — как src/views/SavedView.jsx (без поиска и «вернуть»)
export default function SavedScreen() {
  const { t } = useSettings();
  const { byId } = useContent();
  const { saved, routeIds, setRouteIds } = useStore();
  const c = useColors();
  const list = [...saved].map(byId).filter(Boolean);
  const allToRoute = () => setRouteIds([...routeIds, ...list.map((x) => x.id).filter((id) => !routeIds.includes(id))]);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 16, gap: 14 }}
        ListHeaderComponent={
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <BackButton />
              <Text style={{ fontFamily: FONT.display, fontSize: 28, color: c.ink }}>{t("saved.title")}</Text>
            </View>
            {list.length > 0 && <Button secondary title={t("saved.allToRoute")} onPress={allToRoute} />}
          </View>
        }
        ListEmptyComponent={
          <Empty title={t("saved.emptyTitle")} text={t("saved.emptyText")} action={t("profile.seeTours")} onAction={() => router.navigate("/tours")} />
        }
        renderItem={({ item }) => <TourCard item={item} onPress={() => router.push(`/tour/${encodeURIComponent(item.id)}`)} />}
      />
    </SafeAreaView>
  );
}
