import { useState } from "react";
import { router } from "expo-router";
import { useSettings } from "../../../../src/settings-context";
import { AgencyGate, LogoutButton } from "../../../lib/agency/Gate";
import { AgencyForm } from "../../../lib/agency/AgencyForm";
import { AgencyInfo, AgencyStatus, BookingsTab, GuidesTab, Intro, ToursTab } from "../../../lib/agency/tabs";
import { AgScreen, Chips } from "../../../lib/agency/ui";

// кабинет турагентства — как src/agency/AgencyApp.jsx:
// вход → данные организации и документы → проверка админом → туры, заявки, гиды
export default function AgencyScreen() {
  return <AgencyGate>{(p) => <Cabinet {...p} />}</AgencyGate>;
}

function Cabinet({ agency, setAgency, who, tick, user }) {
  const { t } = useSettings();
  const [tab, setTab] = useState("bookings");
  const [bkBadge, setBkBadge] = useState(0); // новые заявки + непрочитанные сообщения
  const edit = () => router.push("/agency/edit");

  if (!agency) {
    return (
      <AgScreen title={t("ag.brand")} sub={who} right={<LogoutButton />}>
        <Intro />
        <AgencyForm userId={user.id} agency={null} onSaved={setAgency} />
      </AgScreen>
    );
  }

  return (
    <AgScreen title={agency.name} sub={who} right={<LogoutButton />}>
      <Chips
        value={tab}
        onChange={setTab}
        options={[
          { value: "bookings", label: bkBadge ? `${t("ag.tab.bookings")} · ${bkBadge}` : t("ag.tab.bookings") },
          { value: "tours", label: t("ag.tab.tours") },
          { value: "guides", label: t("ag.tab.guides") },
          { value: "agency", label: t("ag.tab.agency") },
        ]}
      />
      <AgencyStatus agency={agency} onEdit={edit} />
      {tab === "tours" && <ToursTab agency={agency} tick={tick} />}
      {tab === "bookings" && <BookingsTab agency={agency} tick={tick} onUnread={setBkBadge} />}
      {tab === "guides" && <GuidesTab agency={agency} tick={tick} />}
      {tab === "agency" && <AgencyInfo agency={agency} onEdit={edit} />}
    </AgScreen>
  );
}
