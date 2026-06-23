"use client";

import { useState } from "react";
import { CalendarEvent } from "@/lib/types";
import {
  getSiteApprovedEmergencyTotal,
  getSitePendingEmergencyTotal,
  getSitePersonnelForDate,
  SitePersonnelRow,
} from "@/lib/calendar-site";
import { formatDisplayDate } from "@/lib/utils";
import {
  getCalendarEvents,
  saveCalendarEvents,
} from "@/lib/storage";
import { updateEmergencyEntryStatus } from "@/lib/emergency-hours";
import { useAuth } from "@/context/AuthContext";

interface SiteControlModalProps {
  date: string;
  site: string;
  onClose: () => void;
  onUpdated?: () => void;
}

export function SiteControlModal({
  date,
  site,
  onClose,
  onUpdated,
}: SiteControlModalProps) {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";
  const [rows, setRows] = useState(() => getSitePersonnelForDate(date, site));
  const approvedTotal = getSiteApprovedEmergencyTotal(rows);
  const pendingTotal = getSitePendingEmergencyTotal(rows);

  const reload = () => setRows(getSitePersonnelForDate(date, site));

  const handleEmergencyReview = (
    entryId: string,
    status: "approved" | "rejected"
  ) => {
    updateEmergencyEntryStatus(entryId, status);
    onUpdated?.();
    reload();
  };

  const handleDeletePersonnel = (row: SitePersonnelRow) => {
    if (!confirm(`確定刪除 ${row.name} 的排程？`)) return;
    const all = getCalendarEvents();
    if (row.scheduleGroupId) {
      saveCalendarEvents(
        all.filter(
          (e) =>
            !(
              e.date === date && e.scheduleGroupId === row.scheduleGroupId
            )
        )
      );
    } else {
      const dayEvents = all.filter((e) => e.date === date);
      const idx = dayEvents.findIndex((e) => e.id === row.eventId);
      const toDelete = new Set([row.eventId]);
      if (idx >= 0 && dayEvents[idx + 1]?.type === "location") {
        toDelete.add(dayEvents[idx + 1].id);
      }
      saveCalendarEvents(all.filter((e) => !toDelete.has(e.id)));
    }
    onUpdated?.();
    const remaining = getSitePersonnelForDate(date, site);
    if (remaining.length === 0) {
      onClose();
    } else {
      reload();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#2a3548] bg-[#111827] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#2a3548] px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#4ecdc4]">進廠管制表</h3>
            <p className="mt-1 text-sm text-white">
              {formatDisplayDate(date)}　{site}
            </p>
            <p className="mt-2 text-xs text-[#8b95a5]">
              合計出工{" "}
              <span className="font-medium text-[#4ecdc4]">{rows.length}</span>{" "}
              人 · 緊急追加（已核准）{" "}
              <span className="font-medium text-green-400">{approvedTotal}</span>{" "}
              小時
              {pendingTotal > 0 && (
                <>
                  {" "}
                  · 待審核{" "}
                  <span className="font-medium text-yellow-400">
                    {pendingTotal}
                  </span>{" "}
                  小時
                </>
              )}
            </p>
            <p className="mt-1 text-[10px] text-[#5a6578]">
              工時已扣除午休 1 小時 · 緊急追加需管理員審核後才計入勞務報酬單
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#8b95a5] hover:bg-[#1a2234] hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="overflow-x-auto px-6 py-4">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#8b95a5]">
              此案場尚無排程人員
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#2a3548] text-xs text-[#8b95a5]">
                <tr>
                  <th className="pb-3 pr-4 font-medium">姓名</th>
                  <th className="pb-3 pr-4 font-medium">時間</th>
                  <th className="pb-3 pr-4 font-medium">工時</th>
                  <th className="pb-3 pr-4 font-medium">填寫人</th>
                  <th className="pb-3 font-medium">緊急追加服務費</th>
                  {canManage && (
                    <th className="pb-3 pl-2 font-medium">操作</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2234]">
                {rows.map((row) => (
                  <PersonnelRow
                    key={row.eventId}
                    row={row}
                    canManage={canManage}
                    onDelete={() => handleDeletePersonnel(row)}
                    onEmergencyReview={handleEmergencyReview}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end border-t border-[#2a3548] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded bg-[#1a6b7a] px-6 py-2 text-sm font-medium text-white hover:bg-[#158a9e]"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}

function PersonnelRow({
  row,
  canManage,
  onDelete,
  onEmergencyReview,
}: {
  row: SitePersonnelRow;
  canManage: boolean;
  onDelete: () => void;
  onEmergencyReview: (id: string, status: "approved" | "rejected") => void;
}) {
  return (
    <tr className="text-[#c8cdd5]">
      <td className="py-3 pr-4 font-medium text-white">{row.name}</td>
      <td className="py-3 pr-4 whitespace-nowrap">
        {row.startTime}–{row.endTime}
      </td>
      <td className="py-3 pr-4">
        {row.workHours >= 8 ? (
          <>
            <div className="text-[#f0c040]">出工 1 人</div>
            <div className="text-xs text-[#5a6578]">滿 8 小時</div>
          </>
        ) : row.workHours > 0 ? (
          <>
            <div className="text-yellow-400">未滿 8 小時</div>
            <div className="text-xs text-[#5a6578]">{row.workHours} 小時</div>
          </>
        ) : (
          <span className="text-[#5a6578]">—</span>
        )}
        {row.emergencyHours > 0 && (
          <div className="text-xs text-red-400">
            緊急追加 {row.emergencyHours} 小時
            <span className="ml-1 text-[#5a6578]">（已扣午休）</span>
          </div>
        )}
      </td>
      <td className="py-3 pr-4 text-xs">{row.applicant}</td>
      <td className="py-3">
        {row.emergencyHours > 0 ? (
          row.emergencyStatus === "approved" ? (
            <span className="rounded border border-green-600 px-2 py-0.5 text-xs text-green-400">
              已核准
            </span>
          ) : row.emergencyStatus === "pending" ? (
            <span className="rounded border border-yellow-600 px-2 py-0.5 text-xs text-yellow-400">
              待審核
            </span>
          ) : row.emergencyStatus === "rejected" ? (
            <span className="rounded border border-red-600 px-2 py-0.5 text-xs text-red-400">
              已駁回
            </span>
          ) : null
        ) : (
          <span className="text-[#5a6578]">—</span>
        )}
      </td>
      {canManage && (
        <td className="py-3 pl-2">
          <div className="flex flex-wrap gap-1">
            {row.emergencyStatus === "pending" && row.emergencyEntryId && (
              <>
                <button
                  onClick={() =>
                    onEmergencyReview(row.emergencyEntryId!, "approved")
                  }
                  className="rounded bg-green-600 px-2 py-0.5 text-[10px] text-white hover:bg-green-500"
                >
                  核准
                </button>
                <button
                  onClick={() =>
                    onEmergencyReview(row.emergencyEntryId!, "rejected")
                  }
                  className="rounded bg-red-600 px-2 py-0.5 text-[10px] text-white hover:bg-red-500"
                >
                  駁回
                </button>
              </>
            )}
            <button
              onClick={onDelete}
              className="rounded px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/10"
            >
              刪除
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}
