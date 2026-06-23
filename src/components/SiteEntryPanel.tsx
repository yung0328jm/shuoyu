"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getSites } from "@/lib/sites";
import { getEmployeeUsers } from "@/lib/storage";
import {
  syncLaborScheduleForSite,
  getDaySiteEntries,
  isLaborOnSite,
  updateLaborTimes,
} from "@/lib/site-entry";
import { User } from "@/lib/types";
import { useDataSyncVersion } from "@/hooks/useDataSyncVersion";

type DayEntry = ReturnType<typeof getDaySiteEntries>[number];

type TimeEdit = {
  start: string;
  end: string;
  stillOnSite: boolean;
};

function toTimeEdit(entry: DayEntry): TimeEdit {
  return {
    start: entry.rawStartTime ?? "08:00",
    end: entry.rawEndTime ?? "17:00",
    stillOnSite: entry.onSite === true || (!entry.rawEndTime && !!entry.rawStartTime),
  };
}

export function SiteEntryPanel({
  initialDate,
  lockDate = false,
  onSaved,
}: {
  initialDate?: string;
  lockDate?: boolean;
  onSaved?: () => void;
} = {}) {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(initialDate ?? today);
  const [site, setSite] = useState("");
  const [sites, setSites] = useState<string[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [laborOpen, setLaborOpen] = useState(true);
  const [timeOpen, setTimeOpen] = useState(true);
  const [commonOpen, setCommonOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [timeEdits, setTimeEdits] = useState<Record<string, TimeEdit>>({});

  const [todayEntries, setTodayEntries] = useState<DayEntry[]>([]);

  const loadScheduledSelection = (targetDate: string, targetSite: string) => {
    const entries = getDaySiteEntries(targetDate, targetSite);
    const empList = getEmployeeUsers();
    const scheduledIds = empList
      .filter((emp) =>
        entries.some((e) => e.category === "labor" && e.name === emp.name)
      )
      .map((emp) => emp.id);
    setSelectedIds(scheduledIds);

    const edits: Record<string, TimeEdit> = {};
    entries
      .filter((e) => e.category === "labor")
      .forEach((e) => {
        edits[e.id] = toTimeEdit(e);
      });
    setTimeEdits(edits);

    return entries;
  };

  const refresh = () => {
    const siteList = getSites();
    setSites(siteList);
    setEmployees(getEmployeeUsers());
    if (!site && siteList.length > 0) setSite(siteList[0]);
    if (date && site) {
      setTodayEntries(loadScheduledSelection(date, site));
    }
  };

  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

  const syncVersion = useDataSyncVersion();

  useEffect(() => {
    refresh();
  }, [date, site, syncVersion]);

  const toggleEmployee = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedIds(employees.map((e) => e.id));

  const clearSelected = () => setSelectedIds([]);

  const registeredBy = user?.name ?? user?.username ?? "—";

  const handleSaveSchedule = () => {
    if (!site || selectedIds.length === 0) {
      setMessage("請選擇案場與至少一位承攬者");
      return;
    }
    const personnel = selectedIds
      .map((id) => employees.find((e) => e.id === id))
      .filter((e): e is User => !!e)
      .map((e) => ({ userId: e.id, userName: e.name }));

    const { added, removed } = syncLaborScheduleForSite(
      date,
      site,
      personnel,
      registeredBy
    );

    const parts: string[] = [];
    if (added > 0) parts.push(`新增 ${added} 人`);
    if (removed > 0) parts.push(`移除 ${removed} 人`);
    setMessage(
      parts.length > 0
        ? `排程已更新（${parts.join("、")}）`
        : "排程無變更"
    );
    setTodayEntries(loadScheduledSelection(date, site));
    onSaved?.();
  };

  const handleSaveTimeAdjustments = () => {
    if (!site) return;
    const laborEntries = todayEntries.filter((e) => e.category === "labor");
    if (laborEntries.length === 0) {
      setMessage("尚無可異動的承攬者紀錄");
      return;
    }

    let updated = 0;
    for (const entry of laborEntries) {
      const edit = timeEdits[entry.id];
      if (!edit?.start) continue;
      const ok = updateLaborTimes(
        date,
        site,
        entry.id,
        edit.start,
        edit.stillOnSite ? undefined : edit.end || undefined,
        registeredBy
      );
      if (ok) updated++;
    }

    setMessage(updated > 0 ? `已更新 ${updated} 人進離廠時間` : "時間無變更");
    setTodayEntries(loadScheduledSelection(date, site));
    onSaved?.();
  };

  const updateTimeEdit = (id: string, patch: Partial<TimeEdit>) => {
    setTimeEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { start: "08:00", end: "17:00", stillOnSite: false }), ...patch },
    }));
  };

  const laborEntries = todayEntries.filter((e) => e.category === "labor");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs text-[#8b95a5]">
          日期
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={lockDate}
            className="mt-1 w-full rounded border border-[#2a3548] bg-[#111827] px-3 py-2 text-sm text-white disabled:opacity-60"
          />
        </label>
        <label className="block text-xs text-[#8b95a5]">
          案場
          <select
            value={site}
            onChange={(e) => setSite(e.target.value)}
            className="mt-1 w-full rounded border border-[#2a3548] bg-[#111827] px-3 py-2 text-sm text-white"
          >
            {sites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded border border-[#2a3548] bg-[#111827]">
        <button
          type="button"
          onClick={() => setCommonOpen(!commonOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm text-[#c8cdd5]"
        >
          常用清單（案場）
          <span className="text-xs text-[#8b95a5]">
            {commonOpen ? "收合" : "展開"}
          </span>
        </button>
        {commonOpen && (
          <div className="border-t border-[#2a3548] px-4 py-3 text-xs text-[#8b95a5]">
            <p>案場：{sites.join("、")}</p>
          </div>
        )}
      </div>

      <section className="rounded border border-[#8b5a2b] bg-[#1a1510]">
        <button
          type="button"
          onClick={() => setLaborOpen(!laborOpen)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <span className="text-sm font-medium text-[#f0c040]">
            勞務承攬者排程
          </span>
          <span className="text-xs text-[#8b95a5]">
            {laborOpen ? "收合" : "展開"}
          </span>
        </button>
        {laborOpen && (
          <div className="space-y-4 border-t border-[#8b5a2b]/50 px-4 py-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-[#8b95a5]">
                  承攬者（可多選，已選 {selectedIds.length} 人）
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-[10px] text-[#f0c040] hover:underline"
                  >
                    全選
                  </button>
                  <button
                    type="button"
                    onClick={clearSelected}
                    className="text-[10px] text-[#8b95a5] hover:underline"
                  >
                    清除
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {employees.map((emp) => {
                  const onSite =
                    site && isLaborOnSite(date, site, emp.id, emp.name);
                  return (
                    <label
                      key={emp.id}
                      className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm ${
                        selectedIds.includes(emp.id)
                          ? "border-[#f0c040] bg-[#2a2010] text-white"
                          : "border-[#2a3548] text-[#c8cdd5] hover:bg-[#141e2e]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(emp.id)}
                        onChange={() => toggleEmployee(emp.id)}
                        className="rounded"
                      />
                      <span className="flex items-center gap-1">
                        {emp.name}
                        {onSite && (
                          <span className="text-[10px] text-[#34d399]">進廠中</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-[#5a6578]">
              一般人員請至案場掃描 QR Code 打卡；管理員可於下方異動進離廠時間。
            </p>

            <button
              type="button"
              onClick={handleSaveSchedule}
              disabled={selectedIds.length === 0}
              className="w-full rounded bg-[#8b6914] py-2.5 text-sm font-medium text-white hover:bg-[#a07a18] disabled:opacity-50"
            >
              確認排程
            </button>
          </div>
        )}
      </section>

      {laborEntries.length > 0 && (
        <section className="rounded border border-[#2a3548] bg-[#111827]">
          <button
            type="button"
            onClick={() => setTimeOpen(!timeOpen)}
            className="flex w-full items-center justify-between px-4 py-3"
          >
            <span className="text-sm font-medium text-[#f0c040]">
              進離廠時間異動
            </span>
            <span className="text-xs text-[#8b95a5]">
              {timeOpen ? "收合" : "展開"}
            </span>
          </button>
          {timeOpen && (
            <div className="space-y-3 border-t border-[#2a3548] px-4 py-4">
              {laborEntries.map((entry) => {
                const edit = timeEdits[entry.id] ?? toTimeEdit(entry);
                return (
                  <div
                    key={entry.id}
                    className="rounded border border-[#2a3548] bg-[#0d1117] p-3"
                  >
                    <div className="mb-3 text-sm font-medium text-white">
                      {entry.name}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs text-[#8b95a5]">
                        進廠時間
                        <input
                          type="time"
                          value={edit.start}
                          onChange={(e) =>
                            updateTimeEdit(entry.id, { start: e.target.value })
                          }
                          className="mt-1 w-full rounded border border-[#2a3548] bg-[#111827] px-3 py-2 text-sm text-white"
                        />
                      </label>
                      <label className="block text-xs text-[#8b95a5]">
                        離廠時間
                        <input
                          type="time"
                          value={edit.end}
                          disabled={edit.stillOnSite}
                          onChange={(e) =>
                            updateTimeEdit(entry.id, { end: e.target.value })
                          }
                          className="mt-1 w-full rounded border border-[#2a3548] bg-[#111827] px-3 py-2 text-sm text-white disabled:opacity-50"
                        />
                      </label>
                    </div>
                    <label className="mt-2 flex items-center gap-2 text-xs text-[#8b95a5]">
                      <input
                        type="checkbox"
                        checked={edit.stillOnSite}
                        onChange={(e) =>
                          updateTimeEdit(entry.id, {
                            stillOnSite: e.target.checked,
                          })
                        }
                        className="rounded"
                      />
                      仍在廠內（尚未離廠）
                    </label>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={handleSaveTimeAdjustments}
                className="w-full rounded bg-[#f0c040] py-2.5 text-sm font-medium text-[#1a1a1a] hover:bg-[#d4a830]"
              >
                儲存時間異動
              </button>
            </div>
          )}
        </section>
      )}

      {todayEntries.length > 0 && (
        <section className="rounded border border-[#2a3548] bg-[#111827] p-4">
          <h3 className="mb-3 text-sm font-medium text-[#f0c040]">
            {date} · {site} 已排程
          </h3>
          <div className="space-y-2">
            {todayEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded bg-[#0d1117] px-3 py-2 text-xs"
              >
                <span className="text-[#c8cdd5]">
                  {entry.category === "contractor" ? "🏢" : "👷"} {entry.name}
                </span>
                <span className="text-[#4ecdc4]">
                  {entry.startTime === "—" && entry.endTime === "待掃描打卡"
                    ? "待掃描打卡"
                    : `${entry.startTime} – ${entry.endTime}`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {message && (
        <p className="text-center text-sm text-green-400">{message}</p>
      )}
    </div>
  );
}
