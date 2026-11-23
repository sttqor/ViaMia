import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../../../src/settings-context";
import { BackButton } from "../ui";
import { FONT, H, RADIUS, useColors } from "../theme";

// общие куски кабинета агентства и модерации — как src/agency/ui.jsx + классы agency.css

// как lib/Screen.js, плюс подпись под заголовком (кто вошёл), кнопка справа и нижняя панель (footer)
export function AgScreen({ title, sub, right, footer, children, root }) {
  const c = useColors();
  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {!root && <BackButton />}
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT.heavy, fontSize: 18, color: c.ink }} numberOfLines={1}>{title}</Text>
              {typeof sub === "string" ? <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: c.muted }} numberOfLines={1}>{sub}</Text> : sub}
            </View>
            {right}
          </View>
          {children}
        </ScrollView>
        {footer ? <View style={{ flexDirection: "row", gap: 10, padding: 16, paddingTop: 10, borderTopWidth: 1, borderColor: c.line, backgroundColor: c.bg }}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Card({ children, style }) {
  const c = useColors();
  return <View style={[{ padding: 16, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, gap: 12 }, style]}>{children}</View>;
}

export function Title({ children }) {
  const c = useColors();
  return <Text style={{ flexShrink: 1, fontFamily: FONT.heavy, fontSize: 17, color: c.ink }}>{children}</Text>;
}

// kind: "muted" | "small" | "bold" | "error" | "reason"
export function Txt({ kind, children, style }) {
  const c = useColors();
  const s = {
    muted: { color: c.muted, fontSize: 14 },
    small: { color: c.muted, fontSize: 13 },
    bold: { fontFamily: FONT.bold, color: c.ink },
    error: { fontFamily: FONT.bold, color: c.accent },
    reason: { fontFamily: FONT.bold, color: c.accent, fontSize: 13 },
  }[kind];
  return <Text style={[{ fontFamily: FONT.ui, fontSize: 15, lineHeight: 21, color: c.ink }, s, style]}>{children}</Text>;
}

// плашка статуса: bad — отказ/блок, ok — одобрено
export function Banner({ tone, title, children }) {
  const c = useColors();
  const color = tone === "ok" ? c.success : tone === "bad" ? c.accent : c.ink;
  return (
    <View style={{ padding: 14, borderRadius: RADIUS.card, gap: 6, backgroundColor: tone === "ok" ? c.successBg : c.bg2 }}>
      {title ? <Text style={{ fontFamily: FONT.heavy, fontSize: 15, color }}>{title}</Text> : null}
      {children}
    </View>
  );
}

const GOOD = ["published", "approved", "confirmed", "done"];
const BAD = ["rejected", "blocked", "declined"];

export function StatusBadge({ kind, status }) {
  const { t } = useSettings();
  const c = useColors();
  const ok = GOOD.includes(status);
  return (
    <View style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.chip, backgroundColor: ok ? c.successBg : c.bg2 }}>
      <Text style={{ fontFamily: FONT.bold, fontSize: 12, color: ok ? c.success : BAD.includes(status) ? c.accent : c.ink }}>{t(`ag.${kind}.${status}`)}</Text>
    </View>
  );
}

export function Field({ label, hint, required, children }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: c.ink }}>
        {label}
        {required ? <Text style={{ color: c.accent }}> *</Text> : null}
      </Text>
      {children}
      {hint ? <Text style={{ fontFamily: FONT.ui, fontSize: 12, lineHeight: 17, color: c.muted }}>{hint}</Text> : null}
    </View>
  );
}

export function Input({ bad, multiline, rows = 4, style, ...rest }) {
  const c = useColors();
  return (
    <TextInput
      placeholderTextColor={c.muted}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
      style={[
        { minHeight: multiline ? rows * 22 + 24 : H.btn, borderRadius: RADIUS.btn, borderWidth: 1, borderColor: bad ? c.accent : c.line, backgroundColor: c.card, paddingHorizontal: 14, paddingVertical: multiline ? 12 : 0, fontFamily: FONT.ui, fontSize: 16, color: c.ink, opacity: rest.editable === false ? 0.5 : 1 },
        style,
      ]}
      {...rest}
    />
  );
}

// чип 36 / 999: и переключатель (вместо Segmented), и маленькая кнопка действия
export function Chip({ label, on, onPress, disabled, Icon, bad }) {
  const c = useColors();
  const fg = on ? c.onSolid : bad ? c.accent : c.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on, disabled: !!disabled }}
      style={({ pressed }) => ({ height: H.chip, paddingHorizontal: 14, borderRadius: RADIUS.chip, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: on ? c.solid : bad ? c.accent : c.line, backgroundColor: on ? c.solid : c.card, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 })}
    >
      {Icon ? <Icon color={fg} size={14} /> : null}
      {label ? <Text style={{ fontFamily: FONT.bold, fontSize: 13, color: fg }}>{label}</Text> : null}
    </Pressable>
  );
}

export function Chips({ options, value, onChange }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => <Chip key={o.value} label={o.label} on={o.value === value} onPress={() => onChange(o.value)} />)}
    </View>
  );
}

export function Toggle({ label, value, onChange }) {
  const c = useColors();
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}>
      <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 15, color: c.ink }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.accent, false: c.line }} />
    </Pressable>
  );
}

// пары «подпись — значение» (dl в вебе)
export function KV({ rows }) {
  const { t } = useSettings();
  const c = useColors();
  return (
    <View style={{ gap: 8 }}>
      {rows.filter(([, v]) => v).map(([k, v]) => (
        <View key={k} style={{ flexDirection: "row", gap: 12 }}>
          <Text style={{ width: 110, fontFamily: FONT.ui, fontSize: 13, color: c.muted }}>{t(k)}</Text>
          {typeof v === "string" ? <Text style={{ flex: 1, fontFamily: FONT.bold, fontSize: 14, color: c.ink }}>{v}</Text> : <View style={{ flex: 1 }}>{v}</View>}
        </View>
      ))}
    </View>
  );
}

export function Row({ children, style }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, style]}>{children}</View>;
}
