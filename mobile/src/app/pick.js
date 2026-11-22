import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Check, Search } from "lucide-react-native";
import { CURRENCIES, LANGUAGES, currencySymbol, displayName } from "../../../src/i18n";
import { useSettings } from "../../../src/settings-context";
import { Screen } from "../../lib/Screen";
import { FONT, H, RADIUS, useColors } from "../../lib/theme";

// выбор языка или валюты — как PickerScreen в src/views/ProfileView.jsx; ?kind=lang | currency
export default function PickScreen() {
  const { kind } = useLocalSearchParams();
  const { t, lang, setLang, currency, setCurrency, fmtRate } = useSettings();
  const c = useColors();
  const [q, setQ] = useState("");
  const isLang = kind === "lang";
  const items = isLang
    ? LANGUAGES.map((l) => ({ code: l.code, label: l.native, sub: displayName("language", l.code, lang) }))
    : CURRENCIES.map((x) => ({
        code: x.code,
        label: displayName("currency", x.code, lang),
        sub: x.code === "USD" ? undefined : `1 USD = ${fmtRate(x.code)}`,
        symbol: currencySymbol(x.code, lang),
      }));
  const active = isLang ? lang : currency;
  const s = q.trim().toLowerCase();
  const list = items.filter((it) => !s || `${it.label} ${it.sub || ""} ${it.code}`.toLowerCase().includes(s));
  const pick = (code) => {
    (isLang ? setLang : setCurrency)(code);
    router.back();
  };

  return (
    <Screen title={t(isLang ? "profile.language" : "profile.currency")}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: H.btn, paddingHorizontal: 14, borderRadius: RADIUS.btn, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
        <Search color={c.muted} size={18} />
        <TextInput value={q} onChangeText={setQ} placeholder={t("common.search")} placeholderTextColor={c.muted} style={{ flex: 1, fontFamily: FONT.ui, fontSize: 15, color: c.ink }} />
      </View>
      <View style={{ borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, overflow: "hidden" }}>
        {list.map((it, i) => (
          <Pressable
            key={it.code}
            onPress={() => pick(it.code)}
            accessibilityState={{ selected: active === it.code }}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line, backgroundColor: pressed ? c.hover : "transparent" })}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT.bold, fontSize: 15, color: c.ink }}>{it.label}</Text>
              {it.sub && it.sub !== it.label ? <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: c.muted }}>{it.sub}</Text> : null}
            </View>
            {it.symbol && it.symbol !== it.code ? <Text style={{ fontFamily: FONT.ui, color: c.muted }}>{it.symbol}</Text> : null}
            <Text style={{ fontFamily: FONT.heavy, color: c.muted }}>{it.code.toUpperCase()}</Text>
            {active === it.code && (
              <Animated.View entering={ZoomIn.springify()}>
                <Check color={c.accent} size={18} />
              </Animated.View>
            )}
          </Pressable>
        ))}
        {list.length === 0 && <Text style={{ padding: 16, fontFamily: FONT.ui, color: c.muted }}>{t("common.nothing")}</Text>}
      </View>
    </Screen>
  );
}
