"use client";

import { SiteEntryPanel } from "@/components/SiteEntryPanel";
import { formatSlashDate } from "@/lib/ban-rest-days";

interface SiteEntryModalProps {
  date: string;
  onClose: () => void;
  onSaved?: () => void;
}

export function SiteEntryModal({ date, onClose, onSaved }: SiteEntryModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#2a3548] bg-[#0a0e17] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2a3548] bg-[#111827] px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#f0c040]">入廠異動申請</h3>
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
        <div className="p-6">
          <SiteEntryPanel
            initialDate={date}
            lockDate
            onSaved={() => {
              onSaved?.();
            }}
          />
        </div>
      </div>
    </div>
  );
}
