import { useEffect, useRef } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import Animated, { FadeOut } from "react-native-reanimated";

// заставка с роликом-дорогой — как Splash в src/App.jsx: тап пропускает, через 7 с — сама уходит
export function Splash({ onDone, bg }) {
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };
  const player = useVideoPlayer(require("../assets/splash.mp4"), (p) => {
    p.muted = true;
    p.play();
  });
  const { status } = useEvent(player, "statusChange", { status: player.status });
  useEffect(() => {
    const sub = player.addListener("playToEnd", finish);
    const safety = setTimeout(finish, 7000);
    return () => (sub.remove(), clearTimeout(safety));
  }, [player]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (status === "error") finish();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View exiting={FadeOut.duration(300)} style={[StyleSheet.absoluteFill, { backgroundColor: bg, zIndex: 3000 }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={finish}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      </Pressable>
    </Animated.View>
  );
}
