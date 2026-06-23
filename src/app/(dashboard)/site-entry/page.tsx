import { SiteEntryPanel } from "@/components/SiteEntryPanel";

export default function SiteEntryPage() {
  return (
    <div className="p-6">
      <h1 className="mb-2 text-2xl font-bold text-[#f0c040]">入廠申請</h1>
      <p className="mb-6 text-sm text-[#8b95a5]">
        登記勞務承攬者進離場時間，自動同步至行事曆排程
      </p>
      <SiteEntryPanel />
    </div>
  );
}
