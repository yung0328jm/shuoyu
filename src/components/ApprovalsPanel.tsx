"use client";

import { useEffect, useState } from "react";
import {
  LeaveApplication,
  PendingEntry,
  ExpenseEntry,
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_LABELS,
  EXPENSE_TYPE_LABELS,
} from "@/lib/types";
import {
  getPendingEntries,
  savePendingEntries,
  getLeaveApplications,
  saveLeaveApplications,
} from "@/lib/storage";
import {
  getExpenses,
  updateExpenseStatus,
  formatCurrency,
  getPendingPurchaseCount,
} from "@/lib/expenses";
import { useAuth } from "@/context/AuthContext";
import { useDataSyncVersion } from "@/hooks/useDataSyncVersion";

interface ApprovalsPanelProps {
  onUpdate?: () => void;
}

export function ApprovalsPanel({ onUpdate }: ApprovalsPanelProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<PendingEntry[]>([]);
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [purchases, setPurchases] = useState<ExpenseEntry[]>([]);

  const refresh = () => {
    setEntries(getPendingEntries().filter((e) => e.status === "pending"));
    setLeaves(getLeaveApplications().filter((l) => l.status === "pending"));
    setPurchases(
      getExpenses().filter(
        (e) => e.type === "purchase" && e.status === "pending"
      )
    );
  };

  const syncVersion = useDataSyncVersion();

  useEffect(() => {
    refresh();
  }, [syncVersion]);

  const handleEntryAction = (id: string, status: "approved" | "rejected") => {
    const all = getPendingEntries();
    savePendingEntries(all.map((e) => (e.id === id ? { ...e, status } : e)));
    refresh();
    onUpdate?.();
  };

  const handleLeaveAction = (id: string, status: "approved" | "rejected") => {
    const all = getLeaveApplications();
    saveLeaveApplications(
      all.map((l) => (l.id === id ? { ...l, status } : l))
    );
    refresh();
    onUpdate?.();
  };

  const handlePurchaseAction = (
    id: string,
    status: "approved" | "rejected"
  ) => {
    updateExpenseStatus(id, status, {
      id: user?.id ?? "admin",
      name: user?.name ?? "管理員",
    });
    refresh();
    onUpdate?.();
  };

  const total = entries.length + leaves.length + purchases.length;
  if (total === 0) {
    return (
      <div className="rounded border border-[#2a3548] bg-[#111827] px-6 py-12 text-center">
        <p className="text-[#8b95a5]">目前沒有待審核項目</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {purchases.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium text-[#f0c040]">
            購買申請（{purchases.length}）
          </h3>
          <div className="space-y-3">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded border border-[#2a3548] bg-[#111827] px-4 py-4"
              >
                <div className="text-sm">
                  <div className="font-medium text-white">
                    {purchase.item} — {formatCurrency(purchase.amount)}
                  </div>
                  <div className="mt-1 text-xs text-[#8b95a5]">
                    案場：{purchase.site}　｜　申請人：{purchase.userName}
                  </div>
                  {purchase.note && (
                    <div className="mt-1 text-xs text-[#c8cdd5]">
                      備註：{purchase.note}
                    </div>
                  )}
                  <span className="mt-2 inline-block rounded bg-purple-900/50 px-2 py-0.5 text-[10px] text-purple-200">
                    {EXPENSE_TYPE_LABELS[purchase.type]} · 待審核
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handlePurchaseAction(purchase.id, "approved")
                    }
                    className="rounded bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-500"
                  >
                    核准購買
                  </button>
                  <button
                    onClick={() =>
                      handlePurchaseAction(purchase.id, "rejected")
                    }
                    className="rounded bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-500"
                  >
                    駁回
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {leaves.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium text-[#f0c040]">
            請假申請（{leaves.length}）
          </h3>
          <div className="space-y-3">
            {leaves.map((leave) => (
              <div
                key={leave.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded border border-[#2a3548] bg-[#111827] px-4 py-4"
              >
                <div className="text-sm">
                  <div className="font-medium text-white">
                    {LEAVE_TYPE_LABELS[leave.leaveType]} — {leave.userName}
                  </div>
                  <div className="mt-1 text-xs text-[#8b95a5]">
                    {leave.startDate} ~ {leave.endDate}　｜　{leave.startTime} -{" "}
                    {leave.endTime}　｜　{leave.totalDays} 天
                  </div>
                  <div className="mt-1 text-xs text-[#c8cdd5]">
                    事由：{leave.reason}
                  </div>
                  <span className="mt-2 inline-block rounded bg-purple-900/50 px-2 py-0.5 text-[10px] text-purple-200">
                    {LEAVE_STATUS_LABELS[leave.status]}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLeaveAction(leave.id, "approved")}
                    className="rounded bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-500"
                  >
                    核准
                  </button>
                  <button
                    onClick={() => handleLeaveAction(leave.id, "rejected")}
                    className="rounded bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-500"
                  >
                    駁回
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {entries.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium text-[#f0c040]">
            緊急追加審核（{entries.length}）
          </h3>
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded border border-[#8b5a2b] bg-[#1a1510] px-4 py-4"
              >
                <div className="text-sm text-[#c8cdd5]">
                  <span className="font-medium text-white">
                    {entry.date} {entry.startTime} ~ {entry.endTime}
                  </span>
                  <span className="mx-2 text-[#8b95a5]">—</span>
                  <span className="text-[#f0c040]">{entry.hours} 小時</span>
                  <div className="mt-1 text-xs text-[#8b95a5]">
                    申請人：{entry.applicant}　｜　人員：{entry.personnel}
                    {entry.id.startsWith("auto-em-") && (
                      <span className="ml-1 text-yellow-400">（超時自動產生，已扣午休）</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEntryAction(entry.id, "approved")}
                    className="rounded bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-500"
                  >
                    核准
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEntryAction(entry.id, "rejected")}
                    className="rounded bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-500"
                  >
                    駁回
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function getPendingApprovalCount() {
  const leaves = getLeaveApplications().filter((l) => l.status === "pending").length;
  const entries = getPendingEntries().filter((e) => e.status === "pending").length;
  const purchases = getPendingPurchaseCount();
  return leaves + entries + purchases;
}
