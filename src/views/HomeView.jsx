import { FactsSection } from "../Facts";
import { OshHeader, PhraseStack, QuickActions, SosCard } from "../HomeBlocks";
import { MiniMap } from "../components/ui.jsx";
import { EventsBell } from "../booking/EventsBell.jsx";

// 1. ГЛАВНАЯ: Ош и погода, факты-сторис, быстрые кнопки, фразы, SOS
export function HomeView({ onGoTo, onOpenExp, onOpenTips, onOpenBooking }) {
  return (
    <div className="gyg-scroll home-view">
      <div className="home-bell"><EventsBell onOpen={onOpenBooking} /></div>
      <OshHeader />
      <FactsSection MiniMap={MiniMap} onGoTo={onGoTo} onOpenExp={onOpenExp} />
      <QuickActions onGoTo={onGoTo} onOpenTips={onOpenTips} />
      <PhraseStack />
      <SosCard />
    </div>
  );
}
