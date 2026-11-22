import { useState } from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Splash } from "../../lib/Splash";
import { StatusBar } from "expo-status-bar";
import { useFonts, Manrope_500Medium, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display";
import { SettingsProvider } from "../../../src/SettingsProvider";
import { AuthProvider } from "../../../src/AuthProvider";
import { ContentProvider } from "../../../src/ContentProvider";
import { useColors } from "../../lib/theme";
import { StoreProvider } from "../../lib/store";

function Screens() {
  const c = useColors();
  const [splash, setSplash] = useState(true);
  return (
    <>
      <StatusBar style={c.dark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: "slide_from_right" }} />
      {splash && <Splash bg={c.bg} onDone={() => setSplash(false)} />}
    </>
  );
}

export default function RootLayout() {
  const [fontsReady] = useFonts({ Manrope_500Medium, Manrope_700Bold, Manrope_800ExtraBold, PlayfairDisplay_700Bold });
  if (!fontsReady) return null; // заставка висит, пока грузятся шрифты
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SettingsProvider>
      <AuthProvider>
        <ContentProvider>
          <StoreProvider>
            <Screens />
          </StoreProvider>
        </ContentProvider>
      </AuthProvider>
    </SettingsProvider>
    </GestureHandlerRootView>
  );
}
