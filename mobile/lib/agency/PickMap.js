import { useEffect, useState } from "react";
import { View } from "react-native";
import { Camera, GeoJSONSource, Layer, Map } from "@maplibre/maplibre-react-native";
import { PALETTE, recolor } from "../../../src/mapStyle";
import { useSettings } from "../../../src/settings-context";
import { RADIUS, useColors } from "../theme";

// точка встречи: тап по карте ставит метку — как PickMap в src/OshMap.jsx
export function PickMap({ lat, lng, onPick }) {
  const { lang } = useSettings();
  const c = useColors();
  const theme = c.dark ? "dark" : "light";
  const [style, setStyle] = useState(null);

  useEffect(() => {
    let off = false;
    fetch(`https://tiles.openfreemap.org/styles/${PALETTE[theme].base}`)
      .then((r) => r.json())
      .then((s) => !off && setStyle(recolor(s, theme, lang)))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [theme, lang]);

  const pin = { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: {} };
  return (
    <View style={{ height: 220, borderRadius: RADIUS.card, overflow: "hidden", borderWidth: 1, borderColor: c.line, backgroundColor: c.bg2 }}>
      {style && (
        <Map style={{ flex: 1 }} mapStyle={style} logo={false} onPress={(e) => { const [x, y] = e.nativeEvent.lngLat; onPick({ lat: +y.toFixed(6), lng: +x.toFixed(6) }); }}>
          <Camera initialViewState={{ center: [lng, lat], zoom: 14 }} />
          <GeoJSONSource id="pick" data={pin}>
            <Layer id="pick-dot" type="circle" paint={{ "circle-color": c.accent, "circle-radius": 9, "circle-stroke-color": c.card, "circle-stroke-width": 3 }} />
          </GeoJSONSource>
        </Map>
      )}
    </View>
  );
}
