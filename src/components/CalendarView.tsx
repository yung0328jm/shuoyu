"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarEvent, LeaveApplication, LEAVE_TYPE_LABELS } from "@/lib/types";
import {
  getCalendarEvents,
  getLeaveApplications,
} from "@/lib/storage";
import { formatMonthYear, getCalendarDays, getDatesBetween } from "@/lib/utils";
import { SiteControlModal } from "@/components/SiteControlModal";
import { LeaveDetailModal } from "@/components/LeaveDetailModal";
import { CalendarActionModal, CalendarDayAction } from "@/components/CalendarActionModal";
import { SiteEntryModal } from "@/components/SiteEntryModal";
import { LeaveApplicationModal } from "@/components/LeaveApplicationModal";
import { getUniqueSitesForDate } from "@/lib/calendar-site";
import { getBanRestDays } from "@/lib/ban-rest-days";
import { useAuth } from "@/context/AuthContext";
import { useDataSyncVersion } from "@/hooks/useDataSyncVersion";

const EVENT_COLORS = {
  location: "bg-[#1a6b7a] text-[#c0eef5] hover:bg-[#158a9e]",
};

const LEAVE_COLORS = {
  pending: "bg-purple-700/80 text-purple-100",
  approved: "bg-green-800/80 text-green-100",
  draft: "bg-slate-600/80 text-slate-200",
  rejected: "bg-red-900/60 text-red-200 line-through",
  cancelled: "bg-slate-700/60 text-slate-400 line-through",
};

export function CalendarView() {
  const { user } = useAuth();
  const isManager = user?.role === "admin" || user?.role === "manager";
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [banRestDays, setBanRestDays] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayAction, setDayAction] = useState<CalendarDayAction | null>(null);
  const [selectedSite, setSelectedSite] = useState<{
    date: string;
    site: string;
  } | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<{
    leave: LeaveApplication;
    date: string;
  } | null>(null);

  const syncVersion = useDataSyncVersion();

  const refresh = useCallback(() => {
    setEvents(getCalendarEvents());
    setLeaves(getLeaveApplications());
    setBanRestDays(getBanRestDays());
  }, []);

  useEffect(() => {
    refresh();
  }, [year, month, refresh, syncVersion]);

  const closeDayFlow = () => {
    setSelectedDate(null);
    setDayAction(null);
  };

  const { cells, weekdayLabels } = getCalendarDays(year, month);

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

  const getEventsForDate = (date: string) =>
    events.filter((e) => e.date === date);

  const getLeavesForDate = (date: string) =>
    leaves.filter(
      (l) =>
        l.status === "approved" &&
        getDatesBetween(l.startDate, l.endDate).includes(date)
    );

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-[#8b95a5]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded bg-[#1a6b7a]" /> 案場
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded bg-purple-700" /> 請假
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded bg-red-900/80" /> 禁休
        </span>
        <span className="ml-auto text-[#5a6578]">
          點擊日期選擇功能 · 點擊案場查看進廠人員 · 點擊請假查看詳情
          {isManager && " · 管理員可審核/刪除"}
        </span>
      </div>

      <div className="mb-6 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-9 w-9 items-center justify-center rounded border border-[#2a3548] text-[#c8cdd5] hover:bg-[#1a2234] hover:text-white"
        >
          ‹
        </button>
        <h2 className="min-w-[160px] text-center text-lg font-medium text-white">
          {formatMonthYear(year, month)}
        </h2>
        <button
          type="button"
          onClick={nextMonth}
          className="flex h-9 w-9 items-center justify-center rounded border border-[#2a3548] text-[#c8cdd5] hover:bg-[#1a2234] hover:text-white"
        >
          ›
        </button>
      </div>

      <div className="overflow-hidden rounded border border-[#2a3548]">
        <div className="grid grid-cols-7 border-b border-[#2a3548] bg-[#111827]">
          {weekdayLabels.map((label, i) => (
            <div
              key={label}
              className={`px-2 py-3 text-center text-sm font-medium ${
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-[#c8cdd5]"
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell) => {
            const dayEvents = getEventsForDate(cell.date);
            const daySites = getUniqueSitesForDate(cell.date, dayEvents);
            const dayLeaves = getLeavesForDate(cell.date);
            const isBanRest = banRestDays.includes(cell.date);
            const isToday = cell.date === todayStr;

            return (
              <div
                key={cell.date}
                role="button"
                tabIndex={cell.inMonth ? 0 : -1}
                onClick={() => cell.inMonth && setSelectedDate(cell.date)}
                onKeyDown={(e) => {
                  if (cell.inMonth && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setSelectedDate(cell.date);
                  }
                }}
                className={`min-h-[100px] border-b border-r border-[#2a3548] p-1.5 text-left transition-colors ${
                  cell.inMonth
                    ? "cursor-pointer bg-[#0d1520] hover:bg-[#141e2e]"
                    : "cursor-default bg-[#0a0e17]"
                } ${isBanRest && cell.inMonth ? "bg-[#1a1010]" : ""}`}
              >
                <div
                  className={`mb-1 text-sm font-medium ${
                    !cell.inMonth
                      ? "text-[#3a4558]"
                      : isToday
                        ? "flex h-6 w-6 items-center justify-center rounded-full bg-[#f0c040] text-[#1a1a1a]"
                        : isBanRest
                          ? "text-red-400"
                          : "text-[#c8cdd5]"
                  }`}
                >
                  {cell.day}
                </div>
                <div className="space-y-0.5">
                  {isBanRest && cell.inMonth && (
                    <div className="truncate rounded bg-red-900/80 px-1.5 py-0.5 text-[11px] leading-tight text-red-100">
                      禁休
                    </div>
                  )}
                  {daySites.map((site) => (
                    <button
                      key={site}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (cell.inMonth) {
                          setSelectedSite({ date: cell.date, site });
                        }
                      }}
                      className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] leading-tight transition-colors ${EVENT_COLORS.location}`}
                      title={`${site} — 點擊查看人員`}
                    >
                      {site}
                    </button>
                  ))}
                  {dayLeaves.map((lv) => (
                    <button
                      key={lv.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (cell.inMonth) {
                          setSelectedLeave({ leave: lv, date: cell.date });
                        }
                      }}
                      className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] leading-tight transition-opacity hover:opacity-90 ${LEAVE_COLORS[lv.status]}`}
                      title={`${lv.userName} - ${LEAVE_TYPE_LABELS[lv.leaveType]} — 點擊查看`}
                    >
                      {LEAVE_TYPE_LABELS[lv.leaveType]} {lv.userName}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedLeave && (
        <LeaveDetailModal
          leave={selectedLeave.leave}
          viewDate={selectedLeave.date}
          onClose={() => setSelectedLeave(null)}
          onUpdated={refresh}
        />
      )}

      {selectedSite && (
        <SiteControlModal
          date={selectedSite.date}
          site={selectedSite.site}
          onClose={() => setSelectedSite(null)}
          onUpdated={refresh}
        />
      )}

      {selectedDate && !dayAction && (
        <CalendarActionModal
          date={selectedDate}
          onClose={closeDayFlow}
          onSelect={(action) => setDayAction(action)}
          onBanRestChanged={refresh}
        />
      )}

      {selectedDate && dayAction === "entry" && (
        <SiteEntryModal
          date={selectedDate}
          onClose={closeDayFlow}
          onSaved={refresh}
        />
      )}

      {selectedDate && dayAction === "leave" && (
        <LeaveApplicationModal
          date={selectedDate}
          onClose={closeDayFlow}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
