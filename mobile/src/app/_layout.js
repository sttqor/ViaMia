import { Stack } from "expo-router";
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
  return (
    <>
      <StatusBar style={c.bg === "#FAF6F0" ? "dark" : "light"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
    </>
  );
}

export default function RootLayout() {
  const [fontsReady] = useFonts({ Manrope_500Medium, Manrope_700Bold, Manrope_800ExtraBold, PlayfairDisplay_700Bold });
  if (!fontsReady) return null; // заставка висит, пока грузятся шрифты
  return (
    <SettingsProvider>
      <AuthProvider>
        <ContentProvider>
          <StoreProvider>
            <Screens />
          </StoreProvider>
        </ContentProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
