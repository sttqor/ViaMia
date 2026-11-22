import { Tabs } from "expo-router";
import { Compass, Map as MapIcon, Route, Sparkles, User } from "lucide-react-native";
import { useSettings } from "../../../../src/settings-context";
import { TabBar } from "../../../lib/TabBar";

// вкладки — как TABS в src/App.jsx
// иконки вкладок; «Маршрут» — терракотовый кружок (accent)
const TABS = {
  index: { Icon: Compass },
  map: { Icon: MapIcon },
  route: { Icon: Route, accent: true },
  tours: { Icon: Sparkles },
  profile: { Icon: User },
};

export default function TabsLayout() {
  const { t } = useSettings();
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} tabs={TABS} />}>
      <Tabs.Screen name="index" options={{ title: t("nav.home") }} />
      <Tabs.Screen name="map" options={{ title: t("nav.map") }} />
      <Tabs.Screen name="route" options={{ title: t("nav.route") }} />
      <Tabs.Screen name="tours" options={{ title: t("nav.tours") }} />
      <Tabs.Screen name="profile" options={{ title: t("nav.profile") }} />
    </Tabs>
  );
}
