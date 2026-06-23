import { SiteEntryPanel } from "@/components/SiteEntryPanel";

export default function SiteEntryPage() {
  return (
    <div className="p-6">
      <h1 className="mb-2 text-2xl font-bold text-[#f0c040]">入廠申請</h1>
      <p className="mb-6 text-sm text-[#8b95a5]">
        選擇案場與承攬者排程至行事曆，進離廠時間請至案場掃描 QR Code 打卡記錄
      </p>
      <SiteEntryPanel />
    </div>
  );
}
