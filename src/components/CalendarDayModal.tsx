"use client";

import { useEffect, useState } from "react";
import {
  CalendarEvent,
  LeaveApplication,
  LeaveType,
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_LABELS,
  User,
} from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import {
  getCalendarEvents,
  saveCalendarEvents,
  getLeaveApplications,
  saveLeaveApplications,
  getEmployeeUsers,
} from "@/lib/storage";
import { calculateLeaveDays, formatDisplayDate } from "@/lib/utils";
import {
  getUniqueSitesForDate,
  getSitePersonnelForDate,
} from "@/lib/calendar-site";

type ModalMode = "schedule" | "leave";

interface CalendarDayModalProps {
  date: string;
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  "w-full rounded border border-[#2a3548] bg-[#0d1117] px-3 py-2 text-sm text-white placeholder-[#5a6578] focus:border-[#f0c040] focus:outline-none";
const labelClass = "mb-1 block text-xs text-[#8b95a5]";

export function CalendarDayModal({ date, onClose, onSaved }: CalendarDayModalProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<ModalMode>("schedule");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [location, setLocation] = useState("中壢日月光");
  const [leaveType, setLeaveType] = useState<LeaveType>("personal");
  const [endDate, setEndDate] = useState(date);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [daySchedules, setDaySchedules] = useState<CalendarEvent[]>([]);
  const [dayLeavesApproved, setDayLeavesApproved] = useState<LeaveApplication[]>([]);
  const [dayLeavesPending, setDayLeavesPending] = useState<LeaveApplication[]>([]);

  useEffect(() => {
    setEmployees(getEmployeeUsers());
    reloadDayItems();
  }, [date]);

  const totalDays = calculateLeaveDays(date, endDate, startTime, endTime);
  const canManage = user?.role === "admin" || user?.role === "manager";

  const reloadDayItems = () => {
    const events = getCalendarEvents().filter((e) => e.date === date);
    setDaySchedules(events);

    const onDay = getLeaveApplications().filter((l) => {
      const dates = getDateRange(l.startDate, l.endDate);
      return dates.includes(date);
    });
    setDayLeavesApproved(onDay.filter((l) => l.status === "approved"));
    setDayLeavesPending(onDay.filter((l) => l.status === "pending"));
  };

  const daySites = getUniqueSitesForDate(date, daySchedules);

  const handleReviewLeave = (
    leaveId: string,
    status: "approved" | "rejected"
  ) => {
    const all = getLeaveApplications();
    saveLeaveApplications(
      all.map((l) => (l.id === leaveId ? { ...l, status } : l))
    );
    reloadDayItems();
    onSaved();
  };

  const handleDeleteLeave = (leave: LeaveApplication) => {
    if (
      !confirm(
        `確定刪除 ${leave.userName} 的${LEAVE_TYPE_LABELS[leave.leaveType]}？`
      )
    )
      return;
    saveLeaveApplications(
      getLeaveApplications().filter((l) => l.id !== leave.id)
    );
    reloadDayItems();
    onSaved();
  };

  const handleAddSchedule = () => {
    if (selectedUserIds.length === 0) {
      setError("請至少選擇一位排程人員");
      return;
    }
    if (!location.trim()) {
      setError("請填寫案場");
      return;
    }

    const selectedEmployees = employees.filter((e) =>
      selectedUserIds.includes(e.id)
    );
    const newEvents: CalendarEvent[] = [];
    const baseTs = Date.now();

    selectedEmployees.forEach((emp, i) => {
      const groupId = `sg-${baseTs}-${i}`;
      newEvents.push(
        {
          id: `e-${baseTs}-${i}-p`,
          date,
          label: emp.name,
          type: "personnel",
          scheduleGroupId: groupId,
          userId: emp.id,
          startTime: "08:00",
          endTime: "17:00",
          entryCategory: "labor",
        },
        {
          id: `e-${baseTs}-${i}-l`,
          date,
          label: location.trim(),
          type: "location",
          scheduleGroupId: groupId,
        }
      );
    });

    saveCalendarEvents([...getCalendarEvents(), ...newEvents]);
    onSaved();
    onClose();
  };

  const toggleEmployee = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllEmployees = () => {
    setSelectedUserIds(employees.map((e) => e.id));
  };

  const clearSelectedEmployees = () => {
    setSelectedUserIds([]);
  };

  const handleApplyLeave = () => {
    if (!reason.trim()) {
      setError("請填寫請假事由");
      return;
    }
    if (totalDays <= 0) {
      setError("請假天數必須大於 0");
      return;
    }

    const application: LeaveApplication = {
      id: `leave-${Date.now()}`,
      userId: user!.id,
      userName: user!.name,
      department: user!.department,
      leaveType,
      startDate: date,
      endDate,
      startTime,
      endTime,
      totalDays,
      reason: reason.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    saveLeaveApplications([application, ...getLeaveApplications()]);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#2a3548] bg-[#111827] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#2a3548] px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#f0c040]">
              {formatDisplayDate(date)}
            </h3>
            <p className="text-xs text-[#8b95a5]">點選日期進行操作</p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#8b95a5] hover:bg-[#1a2234] hover:text-white"
          >
            ✕
          </button>
        </div>

        {(daySites.length > 0 ||
          dayLeavesApproved.length > 0 ||
          dayLeavesPending.length > 0) && (
          <div className="border-b border-[#2a3548] px-6 py-4">
            <p className="mb-2 text-xs font-medium text-[#8b95a5]">
              當日已有項目
              {canManage && (
                <span className="ml-2 text-[#5a6578]">（點擊行事曆案場標籤查看人員）</span>
              )}
            </p>
            <div className="space-y-2">
              {daySites.map((site) => {
                const count = getSitePersonnelForDate(date, site).length;
                return (
                  <div
                    key={site}
                    className="flex items-center justify-between rounded bg-[#0d1117] px-3 py-2"
                  >
                    <span className="text-xs text-[#c8cdd5]">
                      🏗 {site}
                      <span className="ml-2 text-[#4ecdc4]">{count} 人出工</span>
                    </span>
                  </div>
                );
              })}
              {dayLeavesApproved.map((l) => (
                <div
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded bg-[#0d1117] px-3 py-2"
                >
                  <span className="text-xs text-green-300">
                    🏖 {LEAVE_TYPE_LABELS[l.leaveType]} — {l.userName}（已核准）
                  </span>
                  {canManage && (
                    <button
                      onClick={() => handleDeleteLeave(l)}
                      className="shrink-0 rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      刪除
                    </button>
                  )}
                </div>
              ))}
              {dayLeavesPending.map((l) => (
                <div
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-dashed border-purple-700/50 bg-[#0d1117] px-3 py-2"
                >
                  <span className="text-xs text-purple-300">
                    ⏳ {LEAVE_TYPE_LABELS[l.leaveType]} — {l.userName}（
                    {LEAVE_STATUS_LABELS[l.status]}，尚未顯示於行事曆）
                  </span>
                  {canManage && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => handleReviewLeave(l.id, "approved")}
                        className="rounded bg-green-600 px-2 py-0.5 text-xs text-white hover:bg-green-500"
                      >
                        核准
                      </button>
                      <button
                        onClick={() => handleReviewLeave(l.id, "rejected")}
                        className="rounded bg-red-600 px-2 py-0.5 text-xs text-white hover:bg-red-500"
                      >
                        駁回
                      </button>
                      <button
                        onClick={() => handleDeleteLeave(l)}
                        className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/10"
                      >
                        刪除
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex border-b border-[#2a3548]">
          {(["schedule", "leave"] as ModalMode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                mode === m
                  ? "border-b-2 border-[#f0c040] text-[#f0c040]"
                  : "text-[#8b95a5] hover:text-white"
              }`}
            >
              {m === "schedule" ? "新增排程" : "申請請假"}
            </button>
          ))}
        </div>

        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 rounded bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {mode === "schedule" ? (
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className={labelClass}>
                    排程人員 *（可複選，已選 {selectedUserIds.length} 人）
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllEmployees}
                      className="text-[10px] text-[#f0c040] hover:underline"
                    >
                      全選
                    </button>
                    <button
                      type="button"
                      onClick={clearSelectedEmployees}
                      className="text-[10px] text-[#8b95a5] hover:underline"
                    >
                      清除
                    </button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto rounded border border-[#2a3548] bg-[#0d1117]">
                  {employees.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-[#5a6578]">
                      尚無員工，請至用戶管理新增
                    </p>
                  ) : (
                    employees.map((emp) => {
                      const checked = selectedUserIds.includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className={`flex cursor-pointer items-center gap-3 border-b border-[#1a2234] px-3 py-2.5 last:border-b-0 hover:bg-[#141e2e] ${
                            checked ? "bg-[#141e2e]" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleEmployee(emp.id)}
                            className="rounded border-[#2a3548]"
                          />
                          <span className="text-sm text-[#c8cdd5]">
                            {emp.name}
                            <span className="ml-1 text-xs text-[#5a6578]">
                              （{emp.department}）
                            </span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
              <div>
                <label className={labelClass}>案場 / 地點 *</label>
                <input
                  className={inputClass}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="例：中壢日月光"
                />
              </div>
              <button
                onClick={handleAddSchedule}
                disabled={selectedUserIds.length === 0}
                className="w-full rounded bg-[#f0c040] py-2.5 text-sm font-medium text-[#1a1a1a] hover:bg-[#d4a830] disabled:opacity-40"
              >
                新增排程
                {selectedUserIds.length > 0
                  ? `（${selectedUserIds.length} 人）`
                  : ""}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>假別 *</label>
                <select
                  className={inputClass}
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                >
                  {LEAVE_TYPE_ORDER.map((v) => (
                    <option key={v} value={v}>
                      {LEAVE_TYPE_LABELS[v]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>開始日期</label>
                  <input type="date" className={inputClass} value={date} disabled />
                </div>
                <div>
                  <label className={labelClass}>結束日期 *</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={endDate}
                    min={date}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>開始時間</label>
                  <select
                    className={inputClass}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>結束時間</label>
                  <select
                    className={inputClass}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>請假天數</label>
                <div className="rounded border border-[#2a3548] bg-[#0a0e17] px-3 py-2 text-sm text-[#f0c040]">
                  {totalDays} 天
                </div>
              </div>
              <div>
                <label className={labelClass}>請假事由 *</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="請說明請假原因..."
                />
              </div>
              <button
                onClick={handleApplyLeave}
                className="w-full rounded bg-[#f0c040] py-2.5 text-sm font-medium text-[#1a1a1a] hover:bg-[#d4a830]"
              >
                送出請假申請
              </button>
              <p className="text-center text-xs text-[#5a6578]">
                送出後需待管理員審核，核准後才會顯示於行事曆
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) =>
  `${String(h).padStart(2, "0")}:00`
);

const LEAVE_TYPE_ORDER: LeaveType[] = [
  "personal",
  "annual",
  "sick",
  "marriage",
  "bereavement",
  "maternity",
  "official",
  "compensatory",
];

function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (cur <= last) {
    dates.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`
    );
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}
