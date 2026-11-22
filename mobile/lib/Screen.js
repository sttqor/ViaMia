import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "./ui";
import { FONT, useColors } from "./theme";

// экран поверх вкладок: «назад» + заголовок, прокрутка, клавиатура не закрывает поля
export function Screen({ title, children }) {
  const c = useColors();
  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <BackButton />
            <Text style={{ fontFamily: FONT.heavy, fontSize: 18, color: c.ink }}>{title}</Text>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
