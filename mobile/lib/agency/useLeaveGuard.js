import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { useNavigation } from "expo-router";
import { useSettings } from "../../../src/settings-context";

// форма изменена и не сохранена — спросить перед уходом с экрана. вернёт allow(): вызвать после удачного сохранения
export function useLeaveGuard(dirty) {
  const navigation = useNavigation();
  const { t } = useSettings();
  const allowed = useRef(false);
  useEffect(() => {
    if (!dirty) return;
    return navigation.addListener("beforeRemove", (e) => {
      if (allowed.current) return;
      e.preventDefault();
      Alert.alert(t("ag.unsaved.title"), t("ag.unsaved.text"), [
        { text: t("ag.unsaved.stay"), style: "cancel" },
        { text: t("ag.unsaved.leave"), style: "destructive", onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
  }, [dirty, navigation, t]);
  return () => {
    allowed.current = true;
  };
}
