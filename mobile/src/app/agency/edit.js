import { router } from "expo-router";
import { useSettings } from "../../../../src/settings-context";
import { AgencyGate } from "../../../lib/agency/Gate";
import { AgencyForm } from "../../../lib/agency/AgencyForm";
import { AgScreen } from "../../../lib/agency/ui";

// правка данных агентства (после правки одобренное снова уходит на проверку — решает база)
export default function AgencyEditScreen() {
  const { t } = useSettings();
  return (
    <AgencyGate title={t("ag.form.editTitle")}>
      {({ agency, user, who }) => (
        <AgScreen title={t("ag.form.editTitle")} sub={who}>
          <AgencyForm userId={user.id} agency={agency} onSaved={() => router.back()} />
        </AgScreen>
      )}
    </AgencyGate>
  );
}
