"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  LeaveApplication,
  PendingEntry,
  LEAVE_TYPE_LABELS,
} from "@/lib/types";
import {
  getPendingEntries,
  savePendingEntries,
  getLeaveApplications,
  saveLeaveApplications,
} from "@/lib/storage";
import { useAuth } from "@/context/AuthContext";

interface PendingPanelProps {
  onUpdate?: () => void;
  refreshKey?: number;
}

export function PendingPanel({ onUpdate, refreshKey = 0 }: PendingPanelProps) {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";
  const [collapsed, setCollapsed] = useState(false);
  const [entries, setEntries] = useState<PendingEntry[]>([]);
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [feedback, setFeedback] = useState("");

  const refresh = useCallback(() => {
    setEntries(getPendingEntries().filter((e) => e.status === "pending"));
    setLeaves(getLeaveApplications().filter((l) => l.status === "pending"));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  const handleEntryAction = (
    id: string,
    status: "approved" | "rejected"
  ) => {
    if (!canManage) return;
    const all = getPendingEntries();
    savePendingEntries(all.map((e) => (e.id === id ? { ...e, status } : e)));
    setFeedback(status === "approved" ? "已核准緊急追加" : "已駁回緊急追加");
    refresh();
    onUpdate?.();
    setTimeout(() => setFeedback(""), 2500);
  };

  const handleLeaveAction = (
    id: string,
    status: "approved" | "rejected"
  ) => {
    if (!canManage) return;
    const all = getLeaveApplications();
    saveLeaveApplications(
      all.map((l) => (l.id === id ? { ...l, status } : l))
    );
    setFeedback(status === "approved" ? "已核准請假" : "已駁回請假");
    refresh();
    onUpdate?.();
    setTimeout(() => setFeedback(""), 2500);
  };

  const total = entries.length + leaves.length;
  if (total === 0) return null;

  return (
    <div className="relative z-20 mb-4 rounded border border-[#8b5a2b] bg-[#1a1510]">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex-1 text-left text-sm font-medium text-[#f0c040]"
        >
          待審核項目 ({total}) — 點此{collapsed ? "展開" : "收合"}{" "}
          <span className="text-[#8b95a5]">{collapsed ? "▼" : "▲"}</span>
        </button>
        <Link
          href="/approvals"
          className="shrink-0 text-xs text-[#34d399] hover:underline"
        >
          前往審核頁 →
        </Link>
      </div>

      {!collapsed && (
        <div className="relative z-20 space-y-3 border-t border-[#3a2a1a] px-4 py-3">
          {feedback && (
            <p className="text-center text-xs text-green-400">{feedback}</p>
          )}
          {!canManage && (
            <p className="text-center text-xs text-[#8b95a5]">
              僅管理員可審核，請聯絡主管或使用「前往審核頁」
            </p>
          )}

          {leaves.map((leave) => (
            <div
              key={leave.id}
              className="relative z-20 flex flex-wrap items-center justify-between gap-3 rounded bg-[#0d1117] px-4 py-3"
            >
              <div className="text-sm text-[#c8cdd5]">
                <span className="font-medium text-purple-200">
                  {LEAVE_TYPE_LABELS[leave.leaveType]} — {leave.userName}
                </span>
                <div className="mt-1 text-xs text-[#8b95a5]">
                  {leave.startDate} ~ {leave.endDate}（{leave.totalDays} 天）
                </div>
              </div>
              {canManage && (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLeaveAction(leave.id, "approved");
                    }}
                    className="cursor-pointer rounded bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-500"
                  >
                    核准
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLeaveAction(leave.id, "rejected");
                    }}
                    className="cursor-pointer rounded bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-500"
                  >
                    駁回
                  </button>
                </div>
              )}
            </div>
          ))}

          {entries.map((entry) => (
            <div
              key={entry.id}
              className="relative z-20 flex flex-wrap items-center justify-between gap-3 rounded bg-[#0d1117] px-4 py-3"
            >
              <div className="text-sm text-[#c8cdd5]">
                <span className="font-medium text-white">
                  緊急追加 {entry.date} {entry.startTime}~{entry.endTime}
                </span>
                <div className="mt-1 text-xs text-[#8b95a5]">
                  人員：{entry.personnel}　｜　{entry.hours} 小時
                  {entry.id.startsWith("auto-em-") && (
                    <span className="ml-1 text-yellow-400/80">
                      （超時自動，已扣午休）
                    </span>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEntryAction(entry.id, "approved");
                    }}
                    className="cursor-pointer rounded bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-500"
                  >
                    核准
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEntryAction(entry.id, "rejected");
                    }}
                    className="cursor-pointer rounded bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-500"
                  >
                    駁回
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
