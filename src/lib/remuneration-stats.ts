import {
  getCalendarEvents,
  getPendingEntries,
  getAttendanceRecords,
  getUsers,
} from "./storage";
import { User } from "./types";
import {
  calcNetWorkHoursFromTimes,
  STANDARD_WORK_HOURS,
} from "./emergency-hours";

export interface WorkDetail {
  date: string;
  site: string;
  emergencyHours: number;
}

export function findUserByScheduleName(name: string): User | undefined {
  return getUsers().find((u) => u.name === name);
}

function buildDailyHoursMap(
  scheduleEvents: ReturnType<typeof getCalendarEvents>,
  attendance: ReturnType<typeof getAttendanceRecords>
): Map<string, number> {
  const hoursByDate = new Map<string, number>();

  attendance.forEach((r) => {
    if (r.hours > 0) hoursByDate.set(r.date, r.hours);
  });

  // 行事曆起迄時間（已扣午休）優先，避免出勤紀錄毛工時誤算成滿日
  scheduleEvents.forEach((e) => {
    if (e.startTime && e.endTime) {
      hoursByDate.set(
        e.date,
        calcNetWorkHoursFromTimes(e.startTime, e.endTime)
      );
    }
  });

  return hoursByDate;
}

function computeDayStats(hoursByDate: Map<string, number>) {
  let fullDays = 0;
  let partialDayCount = 0;
  let partialHours = 0;
  let incompleteHours = 0;

  hoursByDate.forEach((hours) => {
    if (hours <= 0) return;
    if (hours >= STANDARD_WORK_HOURS) {
      fullDays += 1;
    } else {
      partialDayCount += 1;
      partialHours += hours;
      incompleteHours += STANDARD_WORK_HOURS - hours;
    }
  });

  const workDays = fullDays + partialDayCount;
  const dayUnits = fullDays + partialHours / STANDARD_WORK_HOURS;

  return { workDays, fullDays, partialDayCount, partialHours, incompleteHours, dayUnits };
}

export function getWorkStats(userName: string, year: number, month: number) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const user = getUsers().find((u) => u.name === userName);

  const scheduleEvents = getCalendarEvents().filter(
    (e) =>
      e.type === "personnel" &&
      e.date.startsWith(prefix) &&
      (e.label === userName || (user && e.userId === user.id))
  );

  const attendance = getAttendanceRecords().filter(
    (r) => r.userName === userName && r.date.startsWith(prefix)
  );

  const hoursByDate = buildDailyHoursMap(scheduleEvents, attendance);
  const { workDays, fullDays, partialDayCount, partialHours, incompleteHours, dayUnits } =
    computeDayStats(hoursByDate);

  const approvedEmergency = getPendingEntries().filter(
    (e) =>
      e.status === "approved" &&
      e.date.startsWith(prefix) &&
      e.personnel === userName
  );

  const emergencyHours = approvedEmergency.reduce((s, e) => s + e.hours, 0);
  const nightMealDays = approvedEmergency.filter((e) => e.hours >= 3).length;

  return {
    workDays,
    fullDays,
    partialDayCount,
    partialHours,
    dayUnits,
    emergencyHours,
    incompleteHours,
    nightMealDays,
  };
}

export function getWorkDetails(
  userName: string,
  year: number,
  month: number
): WorkDetail[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const user = getUsers().find((u) => u.name === userName);
  const allEvents = getCalendarEvents();

  const personnelEvents = allEvents.filter(
    (e) =>
      e.type === "personnel" &&
      e.date.startsWith(prefix) &&
      (e.label === userName || (user && e.userId === user.id))
  );

  const emergencyMap = new Map<string, number>();
  getPendingEntries()
    .filter(
      (e) =>
        e.status === "approved" &&
        e.personnel === userName &&
        e.date.startsWith(prefix)
    )
    .forEach((e) => {
      emergencyMap.set(e.date, (emergencyMap.get(e.date) || 0) + e.hours);
    });

  return personnelEvents
    .map((pe) => {
      const loc = allEvents.find(
        (e) =>
          e.type === "location" &&
          e.date === pe.date &&
          e.scheduleGroupId === pe.scheduleGroupId
      );
      return {
        date: pe.date,
        site: loc?.label || "—",
        emergencyHours: emergencyMap.get(pe.date) || 0,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getEmployeesWithSchedule(year: number, month: number) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const users = getUsers().filter((u) => u.role === "employee");
  const events = getCalendarEvents().filter(
    (e) => e.type === "personnel" && e.date.startsWith(prefix)
  );

  const scheduledNames = new Set(events.map((e) => e.label));
  const scheduledUserIds = new Set(
    events.filter((e) => e.userId).map((e) => e.userId!)
  );

  return users.filter(
    (u) => scheduledNames.has(u.name) || scheduledUserIds.has(u.id)
  );
}
