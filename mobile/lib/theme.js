import { useColorScheme } from "react-native";
import { useSettings } from "../../src/settings-context";

// значения — из design/tokens.css и :root[data-theme="dark"] в src/index.css
const LIGHT = {
  accent: "#D4532B", accentHover: "#B8431F", ink: "#1E2638", gold: "#E9B44C", bg: "#FAF6F0",
  bg2: "#F1E9DD", line: "#E8E0D4", muted: "#6B6459", card: "#FFFFFF", success: "#1F6B45",
  successBg: "#E8F3EC", solid: "#1E2638", onSolid: "#FFFFFF", indigo: "#1E2638",
  glass: "rgba(255,255,255,0.82)", glassLens: "rgba(255,255,255,0.55)", hover: "rgba(30,38,56,0.07)",
};
const DARK = {
  ...LIGHT, ink: "#ede7dd", bg: "#12161f", bg2: "#232a38", line: "#2d3546", muted: "#a59d90",
  card: "#1a202c", success: "#6fcf97", successBg: "#1b3326", solid: "#3a4560",
  glass: "rgba(28,34,47,0.8)", glassLens: "rgba(255,255,255,0.1)", hover: "rgba(255,255,255,0.08)", dark: true,
};

export const RADIUS = { btn: 14, card: 20, chip: 999 };
export const H = { btn: 48, chip: 36, iconBtn: 44 };
export const FONT = {
  ui: "Manrope_500Medium", bold: "Manrope_700Bold", heavy: "Manrope_800ExtraBold", display: "PlayfairDisplay_700Bold",
};

export function useColors() {
  const { theme } = useSettings();
  const system = useColorScheme();
  return (theme === "system" ? system : theme) === "dark" ? DARK : LIGHT;
}
