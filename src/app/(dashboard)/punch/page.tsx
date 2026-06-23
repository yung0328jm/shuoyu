import { PunchPanel } from "@/components/PunchPanel";

export default function PunchPage() {
  return (
    <div className="p-6">
      <h1 className="mb-2 text-2xl font-bold text-[#f0c040]">QR 打卡</h1>
      <p className="mb-6 text-sm text-[#8b95a5]">
        掃描案場 QR Code 記錄上班時間，資料同步至出勤紀錄
      </p>
      <PunchPanel />
    </div>
  );
}
