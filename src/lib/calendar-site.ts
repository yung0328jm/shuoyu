import { CalendarEvent, PendingEntry } from "./types";
import { getCalendarEvents, getPendingEntries, getAttendanceRecords } from "./storage";
import {
  calcNetWorkHoursFromTimes,
  resolveEmergencyHours,
} from "./emergency-hours";

export interface SitePersonnelRow {
  eventId: string;
  scheduleGroupId?: string;
  userId?: string;
  name: string;
  startTime: string;
  endTime: string;
  workHours: number;
  emergencyHours: number;
  emergencyEntryId?: string;
  applicant: string;
  emergencyStatus: PendingEntry["status"] | null;
}

export function getUniqueSitesForDate(date: string, events?: CalendarEvent[]): string[] {
  const dayEvents = (events ?? getCalendarEvents()).filter((e) => e.date === date);
  const sites = new Set<string>();

  for (const ev of dayEvents.filter((e) => e.type === "location")) {
    sites.add(ev.label);
  }

  for (const pe of dayEvents.filter((e) => e.type === "personnel")) {
    const site = resolveSiteForPersonnel(pe, dayEvents);
    if (site) sites.add(site);
  }

  return [...sites];
}

export function resolveSiteForPersonnel(
  personnel: CalendarEvent,
  dayEvents: CalendarEvent[]
): string | null {
  if (personnel.scheduleGroupId) {
    const loc = dayEvents.find(
      (e) =>
        e.type === "location" &&
        e.scheduleGroupId === personnel.scheduleGroupId
    );
    return loc?.label ?? null;
  }
  const idx = dayEvents.findIndex((e) => e.id === personnel.id);
  const next = dayEvents[idx + 1];
  if (next?.type === "location") return next.label;
  return null;
}

export function getSitePersonnelForDate(
  date: string,
  site: string
): SitePersonnelRow[] {
  const dayEvents = getCalendarEvents().filter((e) => e.date === date);
  const pending = getPendingEntries().filter((e) => e.date === date);
  const attendance = getAttendanceRecords().filter(
    (r) => r.date === date && r.site === site
  );

  const personnelEvents = dayEvents.filter((e) => e.type === "personnel");

  return personnelEvents
    .filter((pe) => resolveSiteForPersonnel(pe, dayEvents) === site)
    .map((pe) => {
      const emergency = pending.find((p) => p.personnel === pe.label);
      const att = attendance.find((a) => a.userName === pe.label);

      const startTime = pe.startTime ?? emergency?.startTime ?? att?.checkIn ?? "08:00";
      const endTime = pe.endTime ?? emergency?.endTime ?? att?.checkOut ?? "17:00";

      let workHours = 0;
      if (att?.hours && att.hours > 0) {
        workHours = att.hours;
      } else if (startTime && endTime && endTime !== "—") {
        workHours = calcNetWorkHoursFromTimes(startTime, endTime);
      }

      const { hours: emergencyHours, status: emergencyStatus } =
        resolveEmergencyHours(workHours, emergency);

      return {
        eventId: pe.id,
        scheduleGroupId: pe.scheduleGroupId,
        userId: pe.userId,
        name: pe.label,
        startTime,
        endTime,
        workHours,
        emergencyHours,
        emergencyEntryId: emergency?.id,
        applicant: emergency?.applicant ?? pe.registeredBy ?? "—",
        emergencyStatus,
      };
    });
}

export function getSiteEmergencyTotal(rows: SitePersonnelRow[]): number {
  return rows.reduce((sum, r) => sum + r.emergencyHours, 0);
}

export function getSiteApprovedEmergencyTotal(rows: SitePersonnelRow[]): number {
  return rows
    .filter((r) => r.emergencyStatus === "approved")
    .reduce((sum, r) => sum + r.emergencyHours, 0);
}

export function getSitePendingEmergencyTotal(rows: SitePersonnelRow[]): number {
  return rows
    .filter((r) => r.emergencyStatus === "pending")
    .reduce((sum, r) => sum + r.emergencyHours, 0);
}
