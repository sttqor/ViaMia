import { ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BadgeCheck, Check, Clock, Globe, MapPin, Users } from "lucide-react-native";
import { useSettings } from "../../../../src/settings-context";
import { useContent } from "../../../../src/content-context";
import { durationMinutes } from "../../../../src/i18n";
import { priceText } from "../../../../src/components/shared";
import { FONT, RADIUS, useColors } from "../../../lib/theme";
import { useStore } from "../../../lib/store";
import { BackButton, Button, SaveButton } from "../../../lib/ui";

// экран тура — как src/views/Detail.jsx; бронь и карта — следующим шагом
export default function TourScreen() {
  const { id } = useLocalSearchParams();
  const { byId } = useContent();
  const { t, loc, money, plural, fmtDuration } = useSettings();
  const c = useColors();
  const { saved, routeIds, toggleSave, toggleRoute } = useStore();
  const raw = byId(String(id));
  if (!raw) return null;
  const exp = loc(raw);
  const self = !!raw.selfGuided;

  const h = (text) => <Text style={{ fontFamily: FONT.heavy, fontSize: 17, color: c.ink, marginTop: 18, marginBottom: 8 }}>{text}</Text>;
  const body = { fontFamily: FONT.ui, fontSize: 15, lineHeight: 22, color: c.ink };
  const chip = (Icon, text, green) => (
    <View key={text} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, height: 32, borderRadius: RADIUS.chip, backgroundColor: green ? c.successBg : c.bg2 }}>
      {Icon && <Icon color={green ? c.success : c.ink} size={13} />}
      <Text style={{ fontFamily: FONT.bold, fontSize: 13, color: green ? c.success : c.ink }}>{text}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Image source={exp.image} style={{ height: 300 }} contentFit="cover" />
        <View style={{ padding: 16 }}>
          <Text style={{ fontFamily: FONT.bold, fontSize: 12, letterSpacing: 1, color: c.muted }}>{`${exp.type} · ${exp.place}`.toUpperCase()}</Text>
          <Text style={{ fontFamily: FONT.display, fontSize: 28, color: c.ink, marginTop: 6 }}>{exp.title}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 10, alignItems: "center" }}>
            {exp.reviews > 0 && <Text style={{ fontFamily: FONT.ui, color: c.muted }}>{`★ ${exp.rating} · ${plural("pl.reviews", exp.reviews)}`}</Text>}
            <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
              <Clock color={c.muted} size={14} />
              <Text style={{ fontFamily: FONT.ui, color: c.muted }}>{fmtDuration(durationMinutes(exp.duration))}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {exp.freeCancel && chip(null, t("detail.freeCancel"), true)}
            {exp.group && chip(Users, exp.group)}
            {exp.lang && chip(Globe, exp.lang)}
          </View>
          <Text style={[body, { marginTop: 14 }]}>{exp.description}</Text>
          {exp.highlights?.length > 0 && (
            <>
              {h(t("detail.whatsOn"))}
              {exp.highlights.map((x) => (
                <View key={x} style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                  <Check color={c.accent} size={16} style={{ marginTop: 3 }} />
                  <Text style={[body, { flex: 1 }]}>{x}</Text>
                </View>
              ))}
            </>
          )}
          {exp.includes?.length > 0 && (
            <>
              {h(t("detail.includes"))}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{exp.includes.map((x) => chip(null, x))}</View>
            </>
          )}
          {exp.meeting ? (
            <>
              {h(t("detail.meeting"))}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <MapPin color={c.accent} size={16} style={{ marginTop: 3 }} />
                <Text style={[body, { flex: 1 }]}>{exp.meeting}</Text>
              </View>
            </>
          ) : null}
          {!self && exp.agencyName ? (
            <View style={{ marginTop: 18, padding: 14, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, gap: 6 }}>
              <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: c.muted }}>{t("detail.organizer")}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontFamily: FONT.heavy, fontSize: 16, color: c.ink, flex: 1 }}>{exp.agencyName}</Text>
                {raw.agencyVerified && <BadgeCheck color={c.success} size={16} />}
              </View>
              <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: c.muted }}>{t(raw.agencyVerified ? "detail.verifiedText" : "detail.fromSite")}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <SafeAreaView edges={["top"]} style={{ position: "absolute", left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" }}>
        <BackButton />
        <SaveButton saved={saved.has(raw.id)} onPress={() => toggleSave(raw.id)} />
      </SafeAreaView>
      <SafeAreaView edges={["bottom"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: c.card, borderTopWidth: 1, borderColor: c.line }}>
        <View style={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text style={{ fontFamily: FONT.heavy, fontSize: 18, color: c.ink, flex: 1 }}>{priceText(raw, t, money)}</Text>
          <Button
            secondary={routeIds.includes(raw.id)}
            title={t(routeIds.includes(raw.id) ? "card.inRoute" : "card.addRoute")}
            onPress={() => toggleRoute(raw.id)}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
