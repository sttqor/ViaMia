import { useCallback, useEffect, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { LogOut } from "lucide-react-native";
import { useSettings } from "../../../src/settings-context";
import { useAuth } from "../../../src/auth-context";
import { prettyPhone } from "../../../src/phone";
import { fetchMyAgency } from "../../../src/agency/agency-api";
import { LoginForm } from "../LoginForm";
import { Button, IconButton } from "../ui";
import { useColors } from "../theme";
import { AgScreen as Screen, Banner, Txt } from "./ui";

// растёт при каждом возврате на экран (не при первом показе) — перечитать списки после правки на другом экране
export function useFocusTick() {
  const [tick, setTick] = useState(0);
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) first.current = false;
      else setTick((x) => x + 1);
    }, [])
  );
  return tick;
}

export function LogoutButton() {
  const { t } = useSettings();
  const { signOut } = useAuth();
  const c = useColors();
  return (
    <IconButton
      label={t("login.out")}
      onPress={async () => {
        await signOut();
        if (router.canDismiss()) router.dismissAll();
        router.replace("/");
      }}
    >
      <LogOut color={c.ink} size={18} />
    </IconButton>
  );
}

// агентство ещё не заведено — с внутреннего экрана кабинета ведём на его главную (там форма регистрации)
export function NoAgency() {
  const { t } = useSettings();
  return (
    <Screen title={t("ag.brand")}>
      <Txt kind="muted">{t("common.nothing")}</Txt>
      <Button title={t("ag.brand")} onPress={() => router.replace("/agency")} />
    </Screen>
  );
}

// общий вход в кабинет: нет сервера / вход / загрузка агентства / ошибка → children({ agency, setAgency, who, tick })
export function AgencyGate({ title, children }) {
  const { t } = useSettings();
  const { enabled, user } = useAuth();
  const tick = useFocusTick();
  const [agency, setAgency] = useState(undefined); // undefined — грузится, null — ещё не зарегистрировано
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let off = false;
    fetchMyAgency(user.id)
      .then((a) => {
        if (off) return;
        setLoadError(false);
        setAgency(a);
      })
      .catch((err) => {
        console.warn("Кабинет: не загрузилось агентство", err);
        if (!off) setLoadError(true);
      });
    return () => {
      off = true;
    };
  }, [user, reloadKey, tick]);

  const head = title || t("ag.brand");
  if (!enabled) return <Screen title={head}><Banner><Txt>{t("ag.noBackend")}</Txt></Banner></Screen>;
  if (!user) return <Screen title={head}><LoginForm /></Screen>;
  const who = user.email || prettyPhone(user.phone);
  if (loadError) {
    return (
      <Screen title={head} sub={who} right={<LogoutButton />}>
        <Banner tone="bad"><Txt>{t("ag.loadError")}</Txt></Banner>
        <Button title={t("ag.retry")} onPress={() => setReloadKey((k) => k + 1)} />
      </Screen>
    );
  }
  if (agency === undefined) return <Screen title={head}><Txt kind="muted">{t("ag.loading")}</Txt></Screen>;
  return children({ agency, setAgency, who, tick, user });
}
