"use client";

import {
  LeaveApplication,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_LABELS,
} from "@/lib/types";
import { formatDisplayDate } from "@/lib/utils";
import { getLeaveApplications, saveLeaveApplications } from "@/lib/storage";
import { useAuth } from "@/context/AuthContext";

interface LeaveDetailModalProps {
  leave: LeaveApplication;
  viewDate: string;
  onClose: () => void;
  onUpdated?: () => void;
}

const STATUS_STYLES: Record<LeaveApplication["status"], string> = {
  approved: "border-green-600 text-green-400",
  pending: "border-yellow-600 text-yellow-400",
  rejected: "border-red-600 text-red-400",
  draft: "border-slate-500 text-slate-400",
  cancelled: "border-slate-600 text-slate-500",
};

export function LeaveDetailModal({
  leave,
  viewDate,
  onClose,
  onUpdated,
}: LeaveDetailModalProps) {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";

  const isMultiDay = leave.startDate !== leave.endDate;
  const dateRange = isMultiDay
    ? `${formatDisplayDate(leave.startDate)} ～ ${formatDisplayDate(leave.endDate)}`
    : formatDisplayDate(leave.startDate);

  const handleReview = (status: "approved" | "rejected") => {
    saveLeaveApplications(
      getLeaveApplications().map((l) =>
        l.id === leave.id ? { ...l, status } : l
      )
    );
    onUpdated?.();
    onClose();
  };

  const handleDelete = () => {
    if (
      !confirm(
        `確定刪除 ${leave.userName} 的${LEAVE_TYPE_LABELS[leave.leaveType]}？`
      )
    ) {
      return;
    }
    saveLeaveApplications(
      getLeaveApplications().filter((l) => l.id !== leave.id)
    );
    onUpdated?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#2a3548] bg-[#111827] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#2a3548] px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-purple-400">請假資訊</h3>
            <p className="mt-1 text-sm text-white">
              {formatDisplayDate(viewDate)}　{LEAVE_TYPE_LABELS[leave.leaveType]}
            </p>
            <p className="mt-2 text-xs text-[#8b95a5]">
              申請人{" "}
              <span className="font-medium text-[#f0c040]">{leave.userName}</span>
              <span className="mx-2 text-[#5a6578]">·</span>
              {leave.department}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#8b95a5] hover:bg-[#1a2234] hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className={`rounded border px-2 py-0.5 text-xs ${STATUS_STYLES[leave.status]}`}
            >
              {LEAVE_STATUS_LABELS[leave.status]}
            </span>
            <span className="text-xs text-[#8b95a5]">
              共 <span className="text-white">{leave.totalDays}</span> 天
            </span>
          </div>

          <div className="overflow-hidden rounded border border-[#2a3548]">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[#2a3548]">
                <DetailRow label="假別" value={LEAVE_TYPE_LABELS[leave.leaveType]} />
                <DetailRow label="姓名" value={leave.userName} highlight />
                <DetailRow label="部門" value={leave.department} />
                <DetailRow label="請假期間" value={dateRange} />
                <DetailRow
                  label="每日時段"
                  value={`${leave.startTime} ～ ${leave.endTime}`}
                />
                <DetailRow label="請假天數" value={`${leave.totalDays} 天`} />
                <DetailRow label="事由" value={leave.reason || "—"} multiline />
                <DetailRow
                  label="申請時間"
                  value={new Date(leave.createdAt).toLocaleString("zh-TW")}
                />
              </tbody>
            </table>
          </div>

          {isMultiDay && (
            <p className="mt-3 text-[10px] text-[#5a6578]">
              此筆請假橫跨多日，行事曆上已核准的日期皆會顯示標籤
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[#2a3548] px-6 py-4">
          {canManage && leave.status === "pending" && (
            <>
              <button
                onClick={() => handleReview("approved")}
                className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-500"
              >
                核准
              </button>
              <button
                onClick={() => handleReview("rejected")}
                className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500"
              >
                駁回
              </button>
            </>
          )}
          {canManage && (
            <button
              onClick={handleDelete}
              className="rounded border border-red-600/50 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
            >
              刪除
            </button>
          )}
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

function DetailRow({
  label,
  value,
  highlight,
  multiline,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  multiline?: boolean;
}) {
  return (
    <tr className="text-[#c8cdd5]">
      <td className="w-28 shrink-0 bg-[#0d1117] px-3 py-2.5 text-xs text-[#8b95a5]">
        {label}
      </td>
      <td
        className={`px-3 py-2.5 text-sm ${
          highlight ? "font-medium text-[#f0c040]" : "text-white"
        } ${multiline ? "whitespace-pre-wrap" : ""}`}
      >
        {value}
      </td>
    </tr>
  );
}
