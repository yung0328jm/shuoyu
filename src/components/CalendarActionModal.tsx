"use client";

import { isBanRestDay, toggleBanRestDay, formatSlashDate } from "@/lib/ban-rest-days";

export type CalendarDayAction = "entry" | "leave" | "banRest";

interface CalendarActionModalProps {
  date: string;
  isAdmin?: boolean;
  onClose: () => void;
  onSelect: (action: CalendarDayAction) => void;
  onBanRestChanged?: () => void;
}

export function CalendarActionModal({
  date,
  isAdmin = false,
  onClose,
  onSelect,
  onBanRestChanged,
}: CalendarActionModalProps) {
  const banned = isBanRestDay(date);

  const handleBanRest = () => {
    toggleBanRestDay(date);
    onBanRestChanged?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-[#2a3548] bg-[#111827] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">選擇功能</h3>
            <p className="mt-1 text-sm text-[#8b95a5]">
              日期：{formatSlashDate(date)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#8b95a5] hover:bg-[#1a2234] hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {isAdmin && (
            <button
              type="button"
              onClick={() => onSelect("entry")}
              className="w-full rounded-lg bg-[#f0c040] py-3.5 text-base font-medium text-[#1a1a1a] hover:bg-[#d4a830]"
            >
              入廠異動申請
            </button>
          )}
          <button
            type="button"
            onClick={() => onSelect("leave")}
            className="w-full rounded-lg bg-purple-700 py-3.5 text-base font-medium text-white hover:bg-purple-600"
          >
            請假申請
          </button>
          <button
            type="button"
            onClick={handleBanRest}
            className={`w-full rounded-lg border py-3.5 text-base font-medium transition-colors ${
              banned
                ? "border-[#8b95a5] bg-[#1a2234] text-[#c8cdd5] hover:bg-[#2a3548]"
                : "border-red-700/60 bg-[#1a1010] text-red-300 hover:bg-[#251010]"
            }`}
          >
            {banned ? "取消禁休" : "設為禁休"}
          </button>
        </div>
      </div>
    </div>
  );
}
