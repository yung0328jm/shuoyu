"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PunchScanner } from "@/components/PunchScanner";
import { QrSiteManager } from "@/components/QrSiteManager";
import {
  punchAtSite,
  getTodayDateStr,
  getNowTimeStr,
  PunchAction,
} from "@/lib/punch";
import { getAttendanceRecords } from "@/lib/storage";
import { AttendanceRecord, ATTENDANCE_STATUS_LABELS } from "@/lib/types";

function PunchContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const siteParam = searchParams.get("site");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const handledParam = useRef(false);
  const isManager = user?.role === "admin" || user?.role === "manager";

  const refresh = () => {
    if (!user) return;
    const today = getTodayDateStr();
    setTodayRecords(
      getAttendanceRecords().filter(
        (r) => r.userId === user.id && r.date === today
      )
    );
  };

  useEffect(() => {
    refresh();
  }, [user]);

  useEffect(() => {
    if (!siteParam || !user || handledParam.current) return;
    handledParam.current = true;
    const site = decodeURIComponent(siteParam);
    const result = punchAtSite(user.id, user.name, site);
    if (result.ok) {
      if (result.action === "in") {
        setMessage(`✅ 進廠成功！${site} · ${result.record.checkIn}`);
      } else {
        setMessage(
          `✅ 離廠成功！${site} · ${result.record.checkOut}（${result.record.hours} 小時）`
        );
      }
      refresh();
    } else {
      setError(result.message);
    }
  }, [siteParam, user]);

  const handleScanSuccess = (site: string, time: string, action: PunchAction) => {
    if (action === "in") {
      setMessage(`✅ 進廠成功！${site} · ${time}`);
    } else {
      setMessage(`✅ 離廠成功！${site} · ${time}`);
    }
    setError("");
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-[#2a3548] bg-[#111827] p-6">
          <h2 className="mb-1 text-lg font-medium text-[#f0c040]">掃描打卡</h2>
          <p className="mb-4 text-xs text-[#8b95a5]">
            目前時間：{getTodayDateStr()} {getNowTimeStr()}
            <br />
            掃描案場 QR：第一次進廠，同日同案場再掃一次即離廠
          </p>

          {message && (
            <div className="mb-4 rounded border border-[#34d399]/30 bg-[#34d399]/10 px-4 py-3 text-sm text-[#34d399]">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <PunchScanner
            onSuccess={handleScanSuccess}
            onError={(msg) => {
              setError(msg);
              setMessage("");
            }}
          />
        </div>

        <div className="rounded-lg border border-[#2a3548] bg-[#111827] p-6">
          <h2 className="mb-4 text-lg font-medium text-[#f0c040]">今日打卡紀錄</h2>
          {todayRecords.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#5a6578]">
              今日尚未打卡
            </p>
          ) : (
            <div className="space-y-3">
              {todayRecords.map((r) => (
                <div
                  key={r.id}
                  className="rounded border border-[#2a3548] bg-[#0d1117] px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{r.site}</span>
                    <span className="text-xs text-[#8b95a5]">
                      {ATTENDANCE_STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-[#c8cdd5]">
                    進廠 {r.checkIn}
                    {r.checkOut
                      ? ` → 離廠 ${r.checkOut}（${r.hours}h）`
                      : " → 尚未離廠（再掃一次 QR）"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isManager && (
        <div className="rounded-lg border border-[#2a3548] bg-[#111827] p-6">
          <h2 className="mb-4 text-lg font-medium text-[#f0c040]">
            案場 QR Code 管理
          </h2>
          <QrSiteManager />
        </div>
      )}
    </div>
  );
}

export function PunchPanel() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-[#8b95a5]">載入中...</div>
      }
    >
      <PunchContent />
    </Suspense>
  );
}
