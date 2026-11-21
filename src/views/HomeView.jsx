import { FactsSection } from "../Facts";
import { OshHeader, PhraseStack, QuickActions, SosCard } from "../HomeBlocks";
import { MiniMap } from "../components/ui.jsx";

// 1. ГЛАВНАЯ: Ош и погода, факты-сторис, быстрые кнопки, фразы, SOS
export function HomeView({ onGoTo, onOpenExp, onOpenTips }) {
  return (
    <div className="gyg-scroll">
      <OshHeader />
      <FactsSection MiniMap={MiniMap} onGoTo={onGoTo} onOpenExp={onOpenExp} />
      <QuickActions onGoTo={onGoTo} onOpenTips={onOpenTips} />
      <PhraseStack />
      <SosCard />
    </div>
  );
}
