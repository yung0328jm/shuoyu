"use client";

import { useCallback, useEffect, useState } from "react";
import { User } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { getEmployeeUsers } from "@/lib/storage";
import { getEmployeesWithSchedule, getWorkStats } from "@/lib/remuneration-stats";
import { useDataSyncVersion } from "@/hooks/useDataSyncVersion";
import { formatMonthYear } from "@/lib/utils";
import { EmployeeRemunerationCard } from "@/components/EmployeeRemunerationCard";

export function RemunerationFormPanel() {
  const { user } = useAuth();
  const today = new Date();
  const isManager = user?.role === "admin" || user?.role === "manager";

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [cards, setCards] = useState<User[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const syncVersion = useDataSyncVersion();

  const refresh = useCallback(() => {
    const allEmployees = getEmployeeUsers();

    if (isManager) {
      const withSchedule = getEmployeesWithSchedule(year, month);
      const withWork = allEmployees.filter((e) => {
        const s = getWorkStats(e.name, year, month);
        return s.workDays > 0 || s.partialHours > 0 || s.emergencyHours > 0;
      });
      const seen = new Set<string>();
      const combined: User[] = [];
      for (const e of [...withSchedule, ...withWork]) {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          combined.push(e);
        }
      }
      setCards(combined);
    } else if (user) {
      const self = allEmployees.find((e) => e.id === user.id);
      const selfStats = self ? getWorkStats(self.name, year, month) : null;
      if (
        self &&
        selfStats &&
        (selfStats.workDays > 0 ||
          selfStats.partialHours > 0 ||
          selfStats.emergencyHours > 0)
      ) {
        setCards([self]);
      } else {
        setCards([]);
      }
    }
  }, [user, year, month, isManager, refreshKey, syncVersion]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const prevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[#8b95a5]">
          有出工排程的員工會自動顯示勞務報酬單，無需手動產生
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded border border-[#2a3548] text-[#c8cdd5] hover:bg-[#1a2234]"
          >
            ‹
          </button>
          <span className="text-sm font-medium text-[#f0c040]">
            {formatMonthYear(year, month)}
          </span>
          <button
            onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded border border-[#2a3548] text-[#c8cdd5] hover:bg-[#1a2234]"
          >
            ›
          </button>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="rounded border border-[#2a3548] bg-[#111827] px-6 py-16 text-center">
          <p className="text-[#8b95a5]">本月尚無出工紀錄</p>
          <p className="mt-2 text-xs text-[#5a6578]">
            請至「行事曆」為員工新增排程，報酬單將自動出現
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {cards.map((emp) => (
            <EmployeeRemunerationCard
              key={`${emp.id}-${refreshKey}-${syncVersion}`}
              employee={emp}
              year={year}
              month={month}
              canEditParams={isManager}
              onParamsSaved={() => setRefreshKey((k) => k + 1)}
            />
          ))}
        </div>
      )}

      {isManager && cards.length > 0 && (
        <p className="text-center text-xs text-[#5a6578]">
          共 {cards.length} 位員工有出工紀錄 · 管理員可個別設定每位員工的費用參數
        </p>
      )}
    </div>
  );
}
