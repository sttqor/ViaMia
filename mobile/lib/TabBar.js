import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { FONT, useColors } from "./theme";

const NAV_H = 62;
const PAD = 4;
const SPRING = { stiffness: 400, damping: 32 };

// нижняя панель как в iOS 26 (src/TabBar.jsx): стеклянная капсула, «линза» под выбранной вкладкой,
// линзу можно тянуть пальцем, повторный тап — наверх (tabPress → useScrollToTop).
// tabs: { [routeName]: { Icon, accent } }
export function TabBar({ state, descriptors, navigation, tabs }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const n = state.routes.length;
  const slot = width ? (width - PAD * 2) / n : 0;
  const x = useSharedValue(0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    x.set(withSpring(state.index * slot, SPRING));
  }, [state.index, slot, x]);

  const go = (i) => {
    const route = state.routes[i];
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (state.index !== i) Haptics.selectionAsync().catch(() => {});
    if (state.index !== i && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  };

  const clampIdx = (px) => {
    "worklet";
    return Math.max(0, Math.min(n - 1, Math.floor((px - PAD) / slot)));
  };
  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .onBegin(() => {
      pressed.set(withSpring(1, SPRING));
    })
    .onUpdate((e) => {
      x.set(Math.max(0, Math.min((n - 1) * slot, e.x - PAD - slot / 2)));
    })
    .onEnd((e) => {
      const i = clampIdx(e.x);
      x.set(withSpring(i * slot, SPRING));
      runOnJS(go)(i);
    })
    .onFinalize(() => {
      pressed.set(withSpring(0, SPRING));
    });

  const lens = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { scale: 1 + pressed.value * 0.06 }],
    backgroundColor: pressed.value > 0.5 ? c.glassLens : c.hover,
  }));

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 14, right: 14, bottom: Math.max(14, insets.bottom - 6), alignItems: "center" }}>
      <GestureDetector gesture={pan}>
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{
            width: "100%",
            maxWidth: 402,
            height: NAV_H,
            borderRadius: NAV_H / 2,
            overflow: "hidden",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: c.dark ? "rgba(255,255,255,0.12)" : "rgba(30,38,56,0.08)",
            shadowColor: "#1E2638",
            shadowOpacity: 0.14,
            shadowRadius: 17,
            shadowOffset: { width: 0, height: 10 },
            elevation: 10,
          }}
        >
          <BlurView intensity={40} tint={c.dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c.glass }]} />
          {slot > 0 && (
            <Animated.View style={[{ position: "absolute", top: PAD, bottom: PAD, left: PAD, width: slot, borderRadius: 999 }, lens]} />
          )}
          <View style={{ flex: 1, flexDirection: "row", paddingHorizontal: PAD }}>
            {state.routes.map((route, i) => {
              const { options } = descriptors[route.key];
              const tab = tabs[route.name] || {};
              const on = state.index === i;
              const color = on || tab.accent ? c.accent : c.ink;
              return (
                <Pressable
                  key={route.key}
                  onPress={() => go(i)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={options.title}
                  style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 2 }}
                >
                  {tab.accent ? (
                    <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: c.accent, transform: [{ scale: on ? 1.08 : 1 }], shadowColor: c.accent, shadowOpacity: 0.42, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
                      <tab.Icon color="#FFFFFF" size={19} />
                    </View>
                  ) : (
                    tab.Icon && <tab.Icon color={color} size={22} />
                  )}
                  <Text numberOfLines={1} style={{ fontFamily: tab.accent ? FONT.heavy : FONT.bold, fontSize: 11, color }}>{options.title}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

export const TABBAR_SPACE = NAV_H + 30; // отступ снизу у экранов, чтобы капсула не закрывала контент
