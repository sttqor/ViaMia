import { useEffect } from "react";
import { router } from "expo-router";
import { useSettings } from "../../../src/settings-context";
import { useAuth } from "../../../src/auth-context";
import { Screen } from "../../lib/Screen";
import { LoginForm } from "../../lib/LoginForm";

// вход или регистрация — как src/Login.jsx; вошли — назад
export default function LoginScreen() {
  const { t } = useSettings();
  const { user } = useAuth();
  useEffect(() => {
    if (user && router.canGoBack()) router.back();
  }, [user]);
  return (
    <Screen title={t("login.title")}>
      <LoginForm />
    </Screen>
  );
}
