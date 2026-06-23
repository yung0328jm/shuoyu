import { CalendarEvent } from "./types";
import { getCalendarEvents, saveCalendarEvents } from "./storage";
import { resolveSiteForPersonnel } from "./calendar-site";
import {
  calcHoursFromTimes,
  syncAutoEmergencyEntry,
} from "./emergency-hours";

export function formatTime(hour: string, minute: string): string {
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export function parseTime(time: string): { hour: string; minute: string } {
  const [h = "08", m = "00"] = time.split(":");
  return { hour: h, minute: m };
}

export function calcHoursBetween(startTime: string, endTime: string): number {
  return calcHoursFromTimes(startTime, endTime);
}

function findLaborEvent(
  dayEvents: CalendarEvent[],
  site: string,
  userId?: string,
  userName?: string
): CalendarEvent | undefined {
  return dayEvents.find(
    (pe) =>
      pe.type === "personnel" &&
      pe.entryCategory !== "contractor" &&
      (pe.userId === userId || pe.label === userName) &&
      resolveSiteForPersonnel(pe, dayEvents) === site
  );
}

function findContractorEvent(
  dayEvents: CalendarEvent[],
  site: string,
  contractorName: string
): CalendarEvent | undefined {
  return dayEvents.find(
    (pe) =>
      pe.type === "personnel" &&
      pe.entryCategory === "contractor" &&
      pe.label.startsWith(contractorName) &&
      resolveSiteForPersonnel(pe, dayEvents) === site
  );
}

function upsertSchedulePair(
  all: CalendarEvent[],
  date: string,
  site: string,
  personnel: Omit<CalendarEvent, "id" | "date" | "type">,
  existingGroupId?: string
): CalendarEvent[] {
  const dayEvents = all.filter((e) => e.date === date);
  const groupId = existingGroupId ?? `sg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const baseTs = Date.now();

  if (existingGroupId) {
    return all.map((e) => {
      if (e.date !== date || e.scheduleGroupId !== existingGroupId) return e;
      if (e.type === "personnel") {
        return {
          ...e,
          ...personnel,
          label: personnel.label ?? e.label,
          startTime: personnel.startTime ?? e.startTime,
          endTime: personnel.endTime !== undefined ? personnel.endTime : e.endTime,
          onSite: personnel.onSite !== undefined ? personnel.onSite : e.onSite,
          registeredBy: personnel.registeredBy ?? e.registeredBy,
        };
      }
      if (e.type === "location") {
        return { ...e, label: site };
      }
      return e;
    });
  }

  const personnelEvent: CalendarEvent = {
    id: `e-${baseTs}-p`,
    date,
    type: "personnel",
    scheduleGroupId: groupId,
    ...personnel,
  };
  const locationEvent: CalendarEvent = {
    id: `e-${baseTs}-l`,
    date,
    label: site,
    type: "location",
    scheduleGroupId: groupId,
  };

  return [...all, personnelEvent, locationEvent];
}

export interface LaborEntryInput {
  date: string;
  site: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string;
  registeredBy: string;
}

export function syncLaborToCalendar(input: LaborEntryInput): void {
  const all = getCalendarEvents();
  const dayEvents = all.filter((e) => e.date === input.date);
  const existing = findLaborEvent(
    dayEvents,
    input.site,
    input.userId,
    input.userName
  );

  const updated = upsertSchedulePair(
    all,
    input.date,
    input.site,
    {
      label: input.userName,
      userId: input.userId,
      startTime: input.startTime,
      endTime: input.endTime,
      entryCategory: "labor",
      registeredBy: input.registeredBy,
    },
    existing?.scheduleGroupId
  );
  saveCalendarEvents(updated);
  syncAutoEmergencyEntry({
    date: input.date,
    personnel: input.userName,
    startTime: input.startTime,
    endTime: input.endTime,
    applicant: input.registeredBy,
  });
}

export function isLaborOnSite(
  date: string,
  site: string,
  userId: string,
  userName: string
): boolean {
  const dayEvents = getCalendarEvents().filter((e) => e.date === date);
  const existing = findLaborEvent(dayEvents, site, userId, userName);
  if (!existing?.startTime) return false;
  if (existing.onSite === true) return true;
  return !existing.endTime;
}

export function registerLaborEntry(
  date: string,
  site: string,
  userId: string,
  userName: string,
  startTime: string,
  registeredBy: string
): void {
  const all = getCalendarEvents();
  const dayEvents = all.filter((e) => e.date === date);
  const existing = findLaborEvent(dayEvents, site, userId, userName);

  const updated = upsertSchedulePair(
    all,
    date,
    site,
    {
      label: userName,
      userId,
      startTime,
      endTime: undefined,
      entryCategory: "labor",
      onSite: true,
      registeredBy,
    },
    existing?.scheduleGroupId
  );
  saveCalendarEvents(updated);
}

export function registerLaborExit(
  date: string,
  site: string,
  userId: string,
  userName: string,
  endTime: string,
  registeredBy: string
): void {
  const all = getCalendarEvents();
  const dayEvents = all.filter((e) => e.date === date);
  const existing = findLaborEvent(dayEvents, site, userId, userName);

  if (!existing) {
    syncLaborToCalendar({
      date,
      site,
      userId,
      userName,
      startTime: "08:00",
      endTime,
      registeredBy,
    });
    return;
  }

  const startTime = existing.startTime ?? "08:00";
  const updated = all.map((e) =>
    e.id === existing.id
      ? { ...e, endTime, onSite: false, registeredBy }
      : e
  );
  saveCalendarEvents(updated);
  syncAutoEmergencyEntry({
    date,
    personnel: userName,
    startTime,
    endTime,
    applicant: registeredBy,
  });
}

export interface ContractorEntryInput {
  date: string;
  site: string;
  contractorName: string;
  headCount: number;
  startTime: string;
  endTime: string;
  registeredBy: string;
}

export function syncContractorToCalendar(input: ContractorEntryInput): void {
  const all = getCalendarEvents();
  const dayEvents = all.filter((e) => e.date === input.date);
  const label = `${input.contractorName}（${input.headCount}人）`;
  const existing = findContractorEvent(dayEvents, input.site, input.contractorName);

  const updated = upsertSchedulePair(
    all,
    input.date,
    input.site,
    {
      label,
      startTime: input.startTime,
      endTime: input.endTime,
      entryCategory: "contractor",
      headCount: input.headCount,
      registeredBy: input.registeredBy,
    },
    existing?.scheduleGroupId
  );
  saveCalendarEvents(updated);
  syncAutoEmergencyEntry({
    date: input.date,
    personnel: label,
    startTime: input.startTime,
    endTime: input.endTime,
    applicant: input.registeredBy,
  });
}

export function syncLaborScheduleForSite(
  date: string,
  site: string,
  personnel: { userId: string; userName: string }[],
  registeredBy: string
): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  let all = getCalendarEvents();
  const dayEvents = all.filter((e) => e.date === date);
  const selectedIds = new Set(personnel.map((p) => p.userId));

  for (const pe of dayEvents) {
    if (pe.type !== "personnel" || pe.entryCategory === "contractor") continue;
    if (resolveSiteForPersonnel(pe, dayEvents) !== site) continue;
    if (!pe.userId || selectedIds.has(pe.userId)) continue;
    if (pe.startTime) continue;
    const groupId = pe.scheduleGroupId;
    if (groupId) {
      all = all.filter(
        (e) => !(e.date === date && e.scheduleGroupId === groupId)
      );
      removed++;
    }
  }

  for (const p of personnel) {
    const currentDay = all.filter((e) => e.date === date);
    if (findLaborEvent(currentDay, site, p.userId, p.userName)) continue;
    all = upsertSchedulePair(all, date, site, {
      label: p.userName,
      userId: p.userId,
      entryCategory: "labor",
      registeredBy,
    });
    added++;
  }

  saveCalendarEvents(all);
  return { added, removed };
}

export function formatLaborEntryTimes(pe: CalendarEvent): {
  startTime: string;
  endTime: string;
} {
  if (!pe.startTime) {
    return { startTime: "—", endTime: "待掃描打卡" };
  }
  if (pe.onSite) {
    return { startTime: pe.startTime, endTime: "進廠中" };
  }
  return {
    startTime: pe.startTime,
    endTime: pe.endTime ?? "—",
  };
}

export function getDaySiteEntries(date: string, site: string) {
  const dayEvents = getCalendarEvents().filter((e) => e.date === date);
  return dayEvents
    .filter((e) => e.type === "personnel")
    .filter((pe) => resolveSiteForPersonnel(pe, dayEvents) === site)
    .map((pe) => {
      const times = formatLaborEntryTimes(pe);
      return {
        id: pe.id,
        name: pe.label,
        startTime: times.startTime,
        endTime: times.endTime,
        category: pe.entryCategory ?? "labor",
      };
    });
}
