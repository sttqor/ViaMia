import { Tabs } from "expo-router";
import { View } from "react-native";
import { Map as MapIcon, Route, Sparkles, User } from "lucide-react-native";
import { useSettings } from "../../../../src/settings-context";
import { FONT, useColors } from "../../../lib/theme";

// вкладки — как TABS в src/App.jsx (главная — следующим шагом)
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
      <Tabs.Screen name="map" options={{ title: t("nav.map"), tabBarIcon: ({ color }) => <MapIcon color={color} size={22} /> }} />
      <Tabs.Screen
        name="route"
        options={{
          title: t("nav.route"),
          // «Маршрут» выделен терракотовым кружком, как в TABS (accent: true)
          tabBarIcon: () => (
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}>
              <Route color="#FFFFFF" size={19} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="profile" options={{ title: t("nav.profile"), tabBarIcon: ({ color }) => <User color={color} size={22} /> }} />
    </Tabs>
  );
}
