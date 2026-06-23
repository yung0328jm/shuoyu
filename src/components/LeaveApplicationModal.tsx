"use client";

import { useEffect, useState } from "react";
import { LeaveType, LEAVE_TYPE_LABELS } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { getLeaveApplications, saveLeaveApplications } from "@/lib/storage";
import {
  calculateLeaveDays,
  getDatesBetween,
} from "@/lib/utils";
import { isBanRestDay, formatSlashDate } from "@/lib/ban-rest-days";

interface LeaveApplicationModalProps {
  date: string;
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  "w-full rounded border border-[#2a3548] bg-[#0d1117] px-3 py-2 text-sm text-white placeholder-[#5a6578] focus:border-[#f0c040] focus:outline-none";
const labelClass = "mb-1 block text-xs text-[#8b95a5]";

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

export function LeaveApplicationModal({
  date,
  onClose,
  onSaved,
}: LeaveApplicationModalProps) {
  const { user } = useAuth();
  const [leaveType, setLeaveType] = useState<LeaveType>("personal");
  const [endDate, setEndDate] = useState(date);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setEndDate(date);
  }, [date]);

  const totalDays = calculateLeaveDays(date, endDate, startTime, endTime);
  const isBanRest = isBanRestDay(date);

  const handleApplyLeave = () => {
    if (!user) return;
    if (isBanRest) {
      setError("此日為禁休日，無法申請請假");
      return;
    }
    const rangeDates = getDatesBetween(date, endDate);
    const banInRange = rangeDates.filter((d) => isBanRestDay(d));
    if (banInRange.length > 0) {
      setError(`請假期間包含禁休日（${banInRange.join("、")}），無法申請`);
      return;
    }
    if (!reason.trim()) {
      setError("請填寫請假事由");
      return;
    }
    if (totalDays <= 0) {
      setError("請假天數必須大於 0");
      return;
    }

    saveLeaveApplications([
      {
        id: `leave-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        department: user.department,
        leaveType,
        startDate: date,
        endDate,
        startTime,
        endTime,
        totalDays,
        reason: reason.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
      },
      ...getLeaveApplications(),
    ]);
    onSaved();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#2a3548] bg-[#111827] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#2a3548] px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-purple-300">請假申請</h3>
            <p className="text-xs text-[#8b95a5]">日期：{formatSlashDate(date)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#8b95a5] hover:bg-[#1a2234] hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {isBanRest && (
            <div className="rounded bg-red-500/10 px-4 py-2 text-sm text-red-400">
              此日已設為禁休，無法申請請假
            </div>
          )}

          {error && (
            <div className="rounded bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

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
              <input
                type="date"
                className={inputClass}
                value={date}
                disabled
              />
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
                  <option key={t} value={t}>
                    {t}
                  </option>
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
                  <option key={t} value={t}>
                    {t}
                  </option>
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
            type="button"
            onClick={handleApplyLeave}
            disabled={isBanRest}
            className="w-full rounded-lg bg-purple-700 py-3 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-40"
          >
            送出請假申請
          </button>
          <p className="text-center text-xs text-[#5a6578]">
            送出後需待管理員審核，核准後才會顯示於行事曆
          </p>
        </div>
      </div>
    </div>
  );
}
