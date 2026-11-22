import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { Camera, GeoJSONSource, Layer, Map, UserLocation } from "@maplibre/maplibre-react-native";
import { Clock, LocateFixed, Map as MapIcon, Phone, Search, X } from "lucide-react-native";
import PLACES from "../../../../src/places-osm.json";
import { CITY } from "../../../../src/data";
import { fallbackOf } from "../../../../src/i18n";
import { MAP_CATS, PALETTE, recolor } from "../../../../src/mapStyle";
import { distanceM, twoGisPlace, walkMinutes } from "../../../../src/twogis";
import { useSettings } from "../../../../src/settings-context";
import { useContent } from "../../../../src/content-context";
import { Button, IconButton } from "../../../lib/ui";
import { FONT, H, RADIUS, useColors } from "../../../lib/theme";

const CAT = Object.fromEntries(MAP_CATS.map((c) => [c.id, c]));
const point = (lng, lat, props) => ({ type: "Feature", id: props.id, geometry: { type: "Point", coordinates: [lng, lat] }, properties: props });
const styles = new globalThis.Map(); // стиль OpenFreeMap по теме — грузим один раз

// карта Оша — как ExploreMap в src/OshMap.jsx; маршрут и навигатор — следующим шагом
export default function MapScreen() {
  const { t, lang, loc, locale } = useSettings();
  const { allTours, byId } = useContent();
  const c = useColors();
  const theme = c.bg === "#FAF6F0" ? "light" : "dark";
  const camera = useRef(null);
  const [style, setStyle] = useState(null);
  const [failed, setFailed] = useState(false);
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(null); // место или тур
  const [me, setMe] = useState(null); // [lng, lat]
  const [locateError, setLocateError] = useState(false);

  useEffect(() => {
    let off = false;
    const base = PALETTE[theme].base;
    if (!styles.has(base)) styles.set(base, fetch(`https://tiles.openfreemap.org/styles/${base}`).then((r) => r.json()));
    styles
      .get(base)
      .then((s) => !off && (setStyle(recolor(s, theme, lang)), setFailed(false)))
      .catch(() => {
        styles.delete(base);
        if (!off) setFailed(true);
      });
    return () => {
      off = true;
    };
  }, [theme, lang]);

  const placeName = (p) => (fallbackOf(lang) === "ru" ? p.name : p.name_en || p.name) || t("map.poi.noName");
  const font = useMemo(() => {
    for (const l of style?.layers || []) {
      const f = l.layout?.["text-font"];
      if (Array.isArray(f) && typeof f[0] === "string") return f;
    }
    return ["Noto Sans Regular"];
  }, [style]);

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tours =
      cat === "all" || cat === "tours"
        ? allTours.filter((raw) => {
            if (raw.lat == null || raw.lng == null) return false;
            const e = loc(raw);
            return !q || `${e.title} ${e.place} ${e.type} ${raw.title} ${raw.place}`.toLowerCase().includes(q);
          })
        : [];
    const places =
      cat === "tours"
        ? []
        : PLACES.filter(
            (p) => (cat === "all" || p.cat === cat) && (!q || `${p.name} ${p.name_en || ""} ${t(`map.cat.${p.cat}`)}`.toLowerCase().includes(q))
          );
    return {
      type: "FeatureCollection",
      features: [
        ...places.map((p) => point(p.lng, p.lat, { id: p.id, cat: p.cat, prio: CAT[p.cat]?.prio ?? 9, label: placeName(p) })),
        ...tours.map((raw) => point(raw.lng, raw.lat, { id: raw.id, cat: "tours", prio: 0, label: loc(raw).title })),
      ],
    };
  }, [allTours, query, cat, loc, t, lang]); // eslint-disable-line react-hooks/exhaustive-deps -- placeName зависит от lang/t

  async function locate() {
    setLocateError(false);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) throw new Error("denied");
      const pos = await Location.getCurrentPositionAsync({});
      const p = [pos.coords.longitude, pos.coords.latitude];
      setMe(p);
      camera.current?.flyTo({ center: p, zoom: 15, duration: 800 });
    } catch {
      setLocateError(true);
    }
  }

  function onPress(e) {
    const f = e.nativeEvent.features?.[0];
    if (!f) return;
    const id = f.properties.id;
    const tour = f.properties.cat === "tours" ? byId(id) : null;
    setPicked(tour ? { ...tour, cat: "tours", tour: true } : PLACES.find((p) => p.id === id));
  }

  const dist = (p) => {
    const m = distanceM(me, [p.lng, p.lat]);
    const d = m < 1000 ? t("map.m", { n: Math.round(m / 10) * 10 }) : t("map.km", { n: (m / 1000).toLocaleString(locale, { maximumFractionDigits: 1 }) });
    return `${d} · ${t("map.walk", { n: walkMinutes(m) })}`;
  };
  const pickedCat = picked && CAT[picked.cat];
  const color = ["match", ["get", "cat"], ...MAP_CATS.flatMap((x) => [x.id, x.color]), "#6B6459"];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {style && (
        <Map style={{ flex: 1 }} mapStyle={style} logo={false} attributionPosition={{ bottom: 8, left: 8 }} onPress={() => setPicked(null)}>
          <Camera ref={camera} initialViewState={{ center: [CITY.lng, CITY.lat], zoom: 13.5 }} />
          <GeoJSONSource id="pois" data={data} onPress={onPress}>
            {/* shortcut: метки — цветные кружки без значков; значки категорий — через <Images>, когда будет время */}
            <Layer
              id="poi-dot"
              type="circle"
              paint={{
                "circle-color": color,
                "circle-radius": ["case", ["==", ["get", "cat"], "tours"], 9, 6],
                "circle-stroke-color": "#FFFFFF",
                "circle-stroke-width": 2,
              }}
            />
            <Layer
              id="poi-label"
              type="symbol"
              minzoom={14}
              layout={{
                "text-field": ["get", "label"],
                "text-font": font,
                "text-size": 12,
                "text-offset": [0, 1.1],
                "text-anchor": "top",
                "text-max-width": 9,
                "symbol-sort-key": ["get", "prio"],
              }}
              paint={{ "text-color": theme === "dark" ? "#EDE7DD" : "#1E2638", "text-halo-color": c.bg, "text-halo-width": 1.4 }}
            />
          </GeoJSONSource>
          {me && <UserLocation />}
        </Map>
      )}

      {failed && (
        <View style={{ position: "absolute", top: "40%", left: 24, right: 24, alignItems: "center", gap: 8 }}>
          <MapIcon color={c.ink} size={32} />
          <Text style={{ fontFamily: FONT.heavy, fontSize: 17, color: c.ink }}>{t("map.failedTitle")}</Text>
          <Text style={{ fontFamily: FONT.ui, color: c.muted, textAlign: "center" }}>{t("map.failedText")}</Text>
        </View>
      )}

      <SafeAreaView edges={["top"]} style={{ position: "absolute", top: 0, left: 0, right: 0 }} pointerEvents="box-none">
        <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 10 }} pointerEvents="box-none">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: H.btn, paddingHorizontal: 14, borderRadius: RADIUS.btn, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
            <Search color={c.muted} size={18} />
            <TextInput value={query} onChangeText={setQuery} placeholder={t("map.search")} placeholderTextColor={c.muted} style={{ flex: 1, fontFamily: FONT.ui, fontSize: 15, color: c.ink }} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[{ id: "all" }, ...MAP_CATS].map((x) => {
              const on = x.id === cat;
              return (
                <Pressable
                  key={x.id}
                  onPress={() => setCat(x.id)}
                  accessibilityState={{ selected: on }}
                  style={{ height: H.chip, borderRadius: RADIUS.chip, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: on ? c.solid : c.card, borderWidth: 1, borderColor: on ? c.solid : c.line }}
                >
                  {x.Icon && <x.Icon color={on ? c.onSolid : x.color} size={14} />}
                  <Text style={{ fontFamily: FONT.bold, fontSize: 13, color: on ? c.onSolid : c.ink }}>{t(`map.cat.${x.id}`)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>

      <View style={{ position: "absolute", right: 16, bottom: picked ? 200 : 24 }}>
        <IconButton label={t("map.locate")} onPress={locate}>
          <LocateFixed color={c.ink} size={20} />
        </IconButton>
      </View>

      {locateError && (
        <Text style={{ position: "absolute", left: 16, right: 72, bottom: 30, padding: 10, borderRadius: 12, overflow: "hidden", backgroundColor: c.indigo, color: "#FFFFFF", fontFamily: FONT.bold }}>
          {t("map.locateError")}
        </Text>
      )}

      {picked && pickedCat && (
        <View style={{ position: "absolute", left: 12, right: 12, bottom: 12, padding: 16, gap: 10, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: pickedCat.color }}>
              <pickedCat.Icon color="#FFFFFF" size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT.heavy, fontSize: 16, color: c.ink }} numberOfLines={2}>
                {picked.tour ? loc(picked).title : placeName(picked)}
              </Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: c.muted }}>
                {t(`map.cat.${picked.cat}`)}
                {me ? ` · ${dist(picked)}` : ""}
              </Text>
            </View>
            <IconButton label={t("map.poi.close")} onPress={() => setPicked(null)}>
              <X color={c.ink} size={18} />
            </IconButton>
          </View>
          {picked.hours ? (
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
              <Clock color={c.muted} size={14} />
              <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 13, color: c.muted }}>{picked.hours}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {picked.tour && (
              <View style={{ flex: 1 }}>
                <Button title={t("common.details")} onPress={() => router.push(`/tour/${encodeURIComponent(picked.id)}`)} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Button secondary title={t("map.poi.open2gis")} onPress={() => Linking.openURL(twoGisPlace(picked.lat, picked.lng))} />
            </View>
            {picked.phone ? (
              <IconButton label={t("map.poi.call")} onPress={() => Linking.openURL(`tel:${picked.phone.split(/[;,]/)[0].replace(/\s/g, "")}`)}>
                <Phone color={c.ink} size={18} />
              </IconButton>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
}
