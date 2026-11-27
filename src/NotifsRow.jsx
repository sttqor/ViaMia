import { useState } from "react";
import { Bell } from "lucide-react";
import { useSettings } from "./settings-context";
import { useAuth } from "./auth-context";
import { askPushPermission, needsHomeScreen, pushPermission } from "./push";

// «Уведомления о турах» в профиле. Включение по нажатию просит у браузера разрешение на push
// (подписку делает PushSync). Под переключателем — почему push может не приходить.
export function NotifsRow() {
  const { t, notifs, setNotifs } = useSettings();
  const { enabled: authOn, user } = useAuth();
  const [perm, setPerm] = useState(pushPermission);

  async function handleChange(e) {
    const on = e.target.checked;
    setNotifs(on);
    if (on && perm === "default") setPerm(await askPushPermission());
  }

  let hint = null;
  if (notifs) {
    if (perm === "unsupported" && needsHomeScreen()) hint = t("profile.notifsHome");
    else if (perm === "denied") hint = t("profile.notifsBlocked");
    else if (authOn && !user && perm !== "unsupported") hint = t("profile.notifsLogin");
  }

  return (
    <>
      <label className="row-btn">
        <span className="row">
          <Bell size={16} color="var(--terracotta)" />
          <span>{t("profile.notifs")}</span>
        </span>
        <input type="checkbox" checked={notifs} onChange={handleChange} className="switch" />
      </label>
      {hint && <div className="muted t-xs notifs-hint">{hint}</div>}
    </>
  );
}
