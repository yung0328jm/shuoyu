"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getSites } from "@/lib/sites";
import { getEmployeeUsers } from "@/lib/storage";
import {
  syncLaborToCalendar,
  registerLaborEntry,
  registerLaborExit,
  getDaySiteEntries,
  formatTime,
} from "@/lib/site-entry";
import { User } from "@/lib/types";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

interface PersonTime {
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
}

const defaultPersonTime = (): PersonTime => ({
  startHour: "08",
  startMinute: "00",
  endHour: "17",
  endMinute: "00",
});

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
  const [personTimes, setPersonTimes] = useState<Record<string, PersonTime>>({});
  const [laborOpen, setLaborOpen] = useState(true);
  const [commonOpen, setCommonOpen] = useState(false);
  const [message, setMessage] = useState("");

  const [todayEntries, setTodayEntries] = useState<
    ReturnType<typeof getDaySiteEntries>
  >([]);

  const refresh = () => {
    const siteList = getSites();
    setSites(siteList);
    setEmployees(getEmployeeUsers());
    if (!site && siteList.length > 0) setSite(siteList[0]);
    if (date && site) setTodayEntries(getDaySiteEntries(date, site));
  };

  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    refresh();
  }, [date, site]);

  const toggleEmployee = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        return next;
      }
      setPersonTimes((pt) => ({
        ...pt,
        [id]: pt[id] ?? defaultPersonTime(),
      }));
      return [...prev, id];
    });
  };

  const selectAll = () => {
    const ids = employees.map((e) => e.id);
    setSelectedIds(ids);
    setPersonTimes((pt) => {
      const next = { ...pt };
      ids.forEach((id) => {
        if (!next[id]) next[id] = defaultPersonTime();
      });
      return next;
    });
  };

  const clearSelected = () => setSelectedIds([]);

  const updatePersonTime = (
    id: string,
    field: keyof PersonTime,
    value: string
  ) => {
    setPersonTimes((pt) => ({
      ...pt,
      [id]: { ...(pt[id] ?? defaultPersonTime()), [field]: value },
    }));
  };

  const registeredBy = user?.name ?? user?.username ?? "—";

  const handleSyncLabor = () => {
    if (!site || selectedIds.length === 0) {
      setMessage("請選擇案場與至少一位承攬者");
      return;
    }
    selectedIds.forEach((id) => {
      const emp = employees.find((e) => e.id === id);
      if (!emp) return;
      const t = personTimes[id] ?? defaultPersonTime();
      syncLaborToCalendar({
        date,
        site,
        userId: emp.id,
        userName: emp.name,
        startTime: formatTime(t.startHour, t.startMinute),
        endTime: formatTime(t.endHour, t.endMinute),
        registeredBy,
      });
    });
    setMessage(`已同步 ${selectedIds.length} 人至行事曆`);
    refresh();
    onSaved?.();
  };

  const handleLaborEntry = () => {
    if (!site || selectedIds.length === 0) {
      setMessage("請選擇案場與承攬者");
      return;
    }
    selectedIds.forEach((id) => {
      const emp = employees.find((e) => e.id === id);
      if (!emp) return;
      const t = personTimes[id] ?? defaultPersonTime();
      registerLaborEntry(
        date,
        site,
        emp.id,
        emp.name,
        formatTime(t.startHour, t.startMinute),
        registeredBy
      );
    });
    setMessage("進廠登記完成，已同步行事曆");
    refresh();
    onSaved?.();
  };

  const handleLaborExit = () => {
    if (!site || selectedIds.length === 0) {
      setMessage("請選擇案場與承攬者");
      return;
    }
    selectedIds.forEach((id) => {
      const emp = employees.find((e) => e.id === id);
      if (!emp) return;
      const t = personTimes[id] ?? defaultPersonTime();
      registerLaborExit(
        date,
        site,
        emp.id,
        emp.name,
        formatTime(t.endHour, t.endMinute),
        registeredBy
      );
    });
    setMessage("離廠登記完成，已更新行事曆");
    refresh();
    onSaved?.();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* 日期 + 案場 */}
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

      {/* 常用清單 */}
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

      {/* 勞務承攬者 */}
      <section className="rounded border border-[#8b5a2b] bg-[#1a1510]">
        <button
          type="button"
          onClick={() => setLaborOpen(!laborOpen)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <span className="text-sm font-medium text-[#f0c040]">
            勞務承攬者（登記即存當日，同步行事曆）
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
                {employees.map((emp) => (
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
                    {emp.name}
                  </label>
                ))}
              </div>
            </div>

            {selectedIds.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-[#8b95a5]">各人進離場時間</p>
                {selectedIds.map((id) => {
                  const emp = employees.find((e) => e.id === id);
                  const t = personTimes[id] ?? defaultPersonTime();
                  return (
                    <div
                      key={id}
                      className="rounded border border-[#2a3548] bg-[#0d1117] p-3"
                    >
                      <div className="mb-2 text-sm font-medium text-white">
                        {emp?.name}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <TimeField
                          label="進廠時間"
                          hour={t.startHour}
                          minute={t.startMinute}
                          onHour={(v) => updatePersonTime(id, "startHour", v)}
                          onMinute={(v) =>
                            updatePersonTime(id, "startMinute", v)
                          }
                        />
                        <TimeField
                          label="離廠時間"
                          hour={t.endHour}
                          minute={t.endMinute}
                          onHour={(v) => updatePersonTime(id, "endHour", v)}
                          onMinute={(v) =>
                            updatePersonTime(id, "endMinute", v)
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleSyncLabor}
                className="rounded bg-[#8b6914] py-2.5 text-sm font-medium text-white hover:bg-[#a07a18]"
              >
                同步至行事曆
              </button>
              <button
                type="button"
                onClick={handleLaborEntry}
                className="rounded border border-[#8b6914] py-2.5 text-sm text-[#f0c040] hover:bg-[#8b6914]/20"
              >
                進廠登記
              </button>
              <button
                type="button"
                onClick={handleLaborExit}
                className="rounded border border-[#8b6914] py-2.5 text-sm text-[#f0c040] hover:bg-[#8b6914]/20"
              >
                離廠登記
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 當日登記 */}
      {todayEntries.length > 0 && (
        <section className="rounded border border-[#2a3548] bg-[#111827] p-4">
          <h3 className="mb-3 text-sm font-medium text-[#f0c040]">
            {date} · {site} 已登記
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
                  {entry.startTime} – {entry.endTime}
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

function TimeField({
  label,
  hour,
  minute,
  onHour,
  onMinute,
}: {
  label: string;
  hour: string;
  minute: string;
  onHour: (v: string) => void;
  onMinute: (v: string) => void;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs text-[#8b95a5]">{label}</span>
      <div className="flex items-center gap-1">
        <select
          value={hour}
          onChange={(e) => onHour(e.target.value)}
          className="rounded border border-[#2a3548] bg-[#0d1117] px-2 py-2 text-sm text-white"
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="text-xs text-[#8b95a5]">時</span>
        <select
          value={minute}
          onChange={(e) => onMinute(e.target.value)}
          className="rounded border border-[#2a3548] bg-[#0d1117] px-2 py-2 text-sm text-white"
        >
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <span className="text-xs text-[#8b95a5]">分</span>
      </div>
    </div>
  );
}
