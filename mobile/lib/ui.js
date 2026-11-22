import { Pressable, Text } from "react-native";
import { FONT, H, RADIUS, useColors } from "./theme";

// кнопка 48 / радиус 14: основная — терракота, вторичная — белая с рамкой
export function Button({ title, onPress, secondary, disabled }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        height: H.btn,
        borderRadius: RADIUS.btn,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 18,
        backgroundColor: secondary ? c.card : pressed ? c.accentHover : c.accent,
        borderWidth: secondary ? 1 : 0,
        borderColor: c.line,
        opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
      })}
    >
      <Text style={{ fontFamily: FONT.bold, fontSize: 16, color: secondary ? c.ink : "#FFFFFF" }}>{title}</Text>
    </Pressable>
  );
}
