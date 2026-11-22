import { Text, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Check } from "lucide-react-native";
import { useSettings } from "../../../../src/settings-context";
import { useContent } from "../../../../src/content-context";
import { Screen } from "../../../lib/Screen";
import { Button } from "../../../lib/ui";
import { FONT, RADIUS, useColors } from "../../../lib/theme";

// факт целиком — как FactSheet в src/Facts.jsx
export default function FactScreen() {
  const { id } = useLocalSearchParams();
  const { t, loc } = useSettings();
  const { facts, byId } = useContent();
  const c = useColors();
  const raw = facts.find((f) => f.id === id);
  if (!raw) return null;
  const f = loc(raw);
  const exp = f.expId ? byId(f.expId) : null;
  const body = { fontFamily: FONT.ui, fontSize: 15, lineHeight: 23, color: c.ink };

  return (
    <Screen title={t("facts.kicker")}>
      <Image source={f.image} style={{ height: 200, borderRadius: RADIUS.card, backgroundColor: c.bg2 }} contentFit="cover" />
      <Text style={{ fontFamily: FONT.display, fontSize: 28, color: c.ink }}>{f.title}</Text>
      {(f.body || []).map((p) => (
        <Text key={p} style={body}>{p}</Text>
      ))}
      {f.points?.length > 0 && (
        <View style={{ gap: 8, padding: 16, borderRadius: RADIUS.card, backgroundColor: c.bg2 }}>
          {f.points.map((p) => (
            <View key={p} style={{ flexDirection: "row", gap: 8 }}>
              <Check color={c.accent} size={16} style={{ marginTop: 3 }} />
              <Text style={[body, { flex: 1 }]}>{p}</Text>
            </View>
          ))}
        </View>
      )}
      {f.linkLabel && (exp || f.linkTab) ? (
        <Button
          title={f.linkLabel}
          onPress={() => (exp ? router.push(`/tour/${encodeURIComponent(exp.id)}`) : router.navigate(`/${f.linkTab}`))}
        />
      ) : null}
    </Screen>
  );
}
