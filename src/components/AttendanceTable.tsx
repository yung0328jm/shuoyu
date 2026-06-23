"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AttendanceRecord,
  ATTENDANCE_STATUS_LABELS,
  AttendanceStatus,
} from "@/lib/types";
import { getAttendanceRecords } from "@/lib/storage";
import { useAuth } from "@/context/AuthContext";
import {
  deleteAttendanceRecord,
  resolveAttendanceStatus,
} from "@/lib/attendance";
import {
  getAllSiteLateSettings,
  setSiteLateTime,
} from "@/lib/site-late-settings";

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  normal: "text-green-400 bg-green-400/10",
  late: "text-yellow-400 bg-yellow-400/10",
  early_leave: "text-orange-400 bg-orange-400/10",
  absent: "text-red-400 bg-red-400/10",
  overtime: "text-blue-400 bg-blue-400/10",
};

export function AttendanceTable() {
  const { user } = useAuth();
  const isManager = user?.role === "admin" || user?.role === "manager";
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filter, setFilter] = useState<"all" | AttendanceStatus>("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lateSettings, setLateSettings] = useState<
    { site: string; lateTime: string }[]
  >([]);
  const [lateDraft, setLateDraft] = useState<Record<string, string>>({});

  const refresh = useCallback(() => {
    const all = getAttendanceRecords();
    const mine =
      user?.role === "employee"
        ? all.filter((r) => r.userId === user.id)
        : all;
    setRecords(mine.sort((a, b) => b.date.localeCompare(a.date)));
    const settings = getAllSiteLateSettings();
    setLateSettings(settings);
    setLateDraft(Object.fromEntries(settings.map((s) => [s.site, s.lateTime])));
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered =
    filter === "all"
      ? records
      : records.filter((r) => resolveAttendanceStatus(r) === filter);

  const totalHours = filtered.reduce((sum, r) => sum + r.hours, 0);

  const handleDelete = (record: AttendanceRecord) => {
    const canDelete =
      isManager || (user?.role === "employee" && record.userId === user.id);
    if (!canDelete) return;
    if (!confirm(`確定刪除 ${record.date} ${record.site} 的出勤紀錄？`)) return;
    deleteAttendanceRecord(record.id);
    refresh();
  };

  const handleLateTimeSave = (site: string) => {
    const time = lateDraft[site] ?? "";
    if (!setSiteLateTime(site, time)) return;
    refresh();
  };

  return (
    <div className="space-y-4">
      {isManager && (
        <div className="rounded border border-[#2a3548] bg-[#111827]">
          <button
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-[#f0c040]"
          >
            案場遲到時間設定
            <span className="text-xs text-[#8b95a5]">
              {settingsOpen ? "收合" : "展開"}
            </span>
          </button>
          {settingsOpen && (
            <div className="space-y-3 border-t border-[#2a3548] px-4 py-4">
              <p className="text-xs text-[#8b95a5]">
                各案場可自訂遲到時間（例：08:15、08:30），QR 打卡與出勤紀錄會依此計算
              </p>
              {lateSettings.map(({ site, lateTime }) => (
                <div
                  key={site}
                  className="flex flex-wrap items-center justify-between gap-3 rounded bg-[#0d1117] px-4 py-3"
                >
                  <span className="text-sm text-white">{site}</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-[#8b95a5]">
                      遲到時間
                      <input
                        type="time"
                        value={lateDraft[site] ?? lateTime}
                        onChange={(e) =>
                          setLateDraft((prev) => ({
                            ...prev,
                            [site]: e.target.value,
                          }))
                        }
                        className="rounded border border-[#2a3548] bg-[#111827] px-2 py-1.5 text-sm text-white"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleLateTimeSave(site)}
                      className="rounded bg-[#f0c040] px-3 py-1.5 text-xs font-medium text-[#1a1a1a] hover:bg-[#d4a830]"
                    >
                      儲存
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {(
            ["all", "normal", "late", "early_leave", "overtime", "absent"] as const
          ).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded px-3 py-1.5 text-xs transition-colors ${
                filter === s
                  ? "bg-[#f0c040] text-[#1a1a1a]"
                  : "border border-[#2a3548] text-[#8b95a5] hover:text-white"
              }`}
            >
              {s === "all" ? "全部" : ATTENDANCE_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="text-sm text-[#8b95a5]">
          合計工時：
          <span className="font-medium text-[#f0c040]">{totalHours} 小時</span>
        </div>
      </div>

      <div className="overflow-hidden rounded border border-[#2a3548]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#2a3548] bg-[#111827] text-xs text-[#8b95a5]">
              <tr>
                <th className="px-4 py-3">日期</th>
                {user?.role !== "employee" && (
                  <th className="px-4 py-3">員工</th>
                )}
                <th className="px-4 py-3">上班</th>
                <th className="px-4 py-3">下班</th>
                <th className="px-4 py-3">工時</th>
                <th className="px-4 py-3">案場</th>
                <th className="px-4 py-3">狀態</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2234] bg-[#0d1117]">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={user?.role !== "employee" ? 8 : 7}
                    className="px-4 py-8 text-center text-[#5a6578]"
                  >
                    尚無出勤紀錄
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const status = resolveAttendanceStatus(r);
                  const canDelete =
                    isManager ||
                    (user?.role === "employee" && r.userId === user.id);
                  return (
                    <tr key={r.id} className="hover:bg-[#111827]">
                      <td className="px-4 py-3 text-white">{r.date}</td>
                      {user?.role !== "employee" && (
                        <td className="px-4 py-3 text-[#c8cdd5]">
                          {r.userName}
                        </td>
                      )}
                      <td className="px-4 py-3 text-[#c8cdd5]">{r.checkIn}</td>
                      <td className="px-4 py-3 text-[#c8cdd5]">
                        {r.checkOut || "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#f0c040]">
                        {r.hours > 0 ? `${r.hours}h` : "—"}
                      </td>
                      <td className="px-4 py-3 text-[#8b95a5]">{r.site}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${STATUS_COLORS[status]}`}
                        >
                          {ATTENDANCE_STATUS_LABELS[status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(r)}
                            className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                          >
                            刪除
                          </button>
                        ) : (
                          <span className="text-[#5a6578]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
