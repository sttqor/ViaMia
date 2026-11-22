import { Tabs } from "expo-router";
import { Sparkles, User } from "lucide-react-native";
import { useSettings } from "../../../../src/settings-context";
import { FONT, useColors } from "../../../lib/theme";

// вкладки — как TABS в src/App.jsx; карта и маршрут — следующим шагом
export default function TabsLayout() {
  const { t } = useSettings();
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line },
        tabBarLabelStyle: { fontFamily: FONT.bold, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("nav.tours"), tabBarIcon: ({ color }) => <Sparkles color={color} size={22} /> }} />
      <Tabs.Screen name="profile" options={{ title: t("nav.profile"), tabBarIcon: ({ color }) => <User color={color} size={22} /> }} />
    </Tabs>
  );
}
