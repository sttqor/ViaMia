import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Splash } from "../../lib/Splash";
import { Onboarding } from "../../lib/Onboarding";
import { useSettings } from "../../../src/settings-context";
import { StatusBar } from "expo-status-bar";
import { useFonts, Manrope_500Medium, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display";
import { SettingsProvider } from "../../../src/SettingsProvider";
import { AuthProvider } from "../../../src/AuthProvider";
import { ContentProvider } from "../../../src/ContentProvider";
import { refreshRates } from "../../../src/rates";
import { useColors } from "../../lib/theme";
import { StoreProvider } from "../../lib/store";
import { RolesProvider, useRoles } from "../../lib/roles";
import { signInWithProvider } from "../../lib/oauth";

function Screens() {
  const c = useColors();
  const [splash, setSplash] = useState(true);
  const { travelMode, setTravelMode } = useSettings();
  const { home } = useRoles();
  // агентство и админ работают в своём кабинете: туристические вкладки им не показываем
  useEffect(() => {
    if (!home) return;
    if (router.canDismiss()) router.dismissAll();
    router.replace(home);
  }, [home]);
  // вернулись в приложение — курсы валют обновятся, если кэш устарел (как visibilitychange в вебе)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s === "active" && refreshRates());
    return () => sub.remove();
  }, []);
  return (
    <>
      <StatusBar style={c.dark ? "light" : "dark"} />
      {/* первый запуск: «сам или с гидом» — как в src/App.jsx */}
      {travelMode === null && !splash && !home ? <Onboarding onPick={setTravelMode} /> : <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: "slide_from_right" }} />}
      {splash && <Splash bg={c.bg} onDone={() => setSplash(false)} />}
    </>
  );
}

export default function RootLayout() {
  const [fontsReady, fontsError] = useFonts({ Manrope_500Medium, Manrope_700Bold, Manrope_800ExtraBold, PlayfairDisplay_700Bold });
  if (!fontsReady && !fontsError) return null; // заставка висит, пока грузятся шрифты
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SettingsProvider>
      <AuthProvider oauth={signInWithProvider}>
        <ContentProvider>
          <StoreProvider>
            <RolesProvider>
              <Screens />
            </RolesProvider>
          </StoreProvider>
        </ContentProvider>
      </AuthProvider>
    </SettingsProvider>
    </GestureHandlerRootView>
  );
}
