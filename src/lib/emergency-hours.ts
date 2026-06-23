import { PendingEntry } from "./types";
import { getPendingEntries, savePendingEntries } from "./storage";

export const STANDARD_WORK_HOURS = 8;
export const LUNCH_BREAK_HOURS = 1;
/** 毛工時超過此值才扣午休 */
export const LUNCH_DEDUCT_THRESHOLD = 4;

export function calcHoursFromTimes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  return Math.max(0, Math.round((mins / 60) * 10) / 10);
}

/** 扣除午休 1 小時後的淨工時 */
export function calcNetWorkHours(grossHours: number): number {
  if (grossHours > LUNCH_DEDUCT_THRESHOLD) {
    return Math.max(
      0,
      Math.round((grossHours - LUNCH_BREAK_HOURS) * 10) / 10
    );
  }
  return grossHours;
}

export function calcNetWorkHoursFromTimes(start: string, end: string): number {
  return calcNetWorkHours(calcHoursFromTimes(start, end));
}

/** 超過 8 小時的部分 = 緊急追加時數（以扣午休後的淨工時計算） */
export function calcEmergencyHours(netHours: number): number {
  if (netHours <= STANDARD_WORK_HOURS) return 0;
  return Math.round((netHours - STANDARD_WORK_HOURS) * 10) / 10;
}

export function syncAutoEmergencyEntry(params: {
  date: string;
  personnel: string;
  startTime: string;
  endTime: string;
  applicant: string;
  totalHours?: number;
}): void {
  const netHours =
    params.totalHours ??
    calcNetWorkHoursFromTimes(params.startTime, params.endTime);
  const emergencyHours = calcEmergencyHours(netHours);
  const all = getPendingEntries();
  const autoIdx = all.findIndex(
    (e) =>
      e.id.startsWith("auto-em-") &&
      e.date === params.date &&
      e.personnel === params.personnel
  );
  const manualIdx = all.findIndex(
    (e) =>
      !e.id.startsWith("auto-em-") &&
      e.date === params.date &&
      e.personnel === params.personnel
  );

  if (emergencyHours <= 0) {
    if (autoIdx >= 0) {
      savePendingEntries(all.filter((_, i) => i !== autoIdx));
    }
    return;
  }

  if (manualIdx >= 0) return;

  const entry: PendingEntry = {
    id: autoIdx >= 0 ? all[autoIdx].id : `auto-em-${Date.now()}`,
    date: params.date,
    startTime: params.startTime,
    endTime: params.endTime,
    hours: emergencyHours,
    applicant: params.applicant,
    personnel: params.personnel,
    status: "pending",
  };

  if (autoIdx >= 0) {
    savePendingEntries(all.map((e, i) => (i === autoIdx ? entry : e)));
  } else {
    savePendingEntries([entry, ...all]);
  }
}

export function resolveEmergencyHours(
  netWorkHours: number,
  pending?: PendingEntry | null
): { hours: number; status: PendingEntry["status"] | null } {
  if (pending) {
    if (pending.status === "rejected") {
      return { hours: 0, status: "rejected" };
    }
    return { hours: pending.hours, status: pending.status };
  }

  const auto = calcEmergencyHours(netWorkHours);
  if (auto > 0) {
    return { hours: auto, status: "pending" };
  }
  return { hours: 0, status: null };
}

export function updateEmergencyEntryStatus(
  id: string,
  status: "approved" | "rejected"
): boolean {
  const all = getPendingEntries();
  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  all[idx] = { ...all[idx], status };
  savePendingEntries(all);
  return true;
}

export function findEmergencyEntry(
  date: string,
  personnel: string
): PendingEntry | undefined {
  return getPendingEntries().find(
    (e) => e.date === date && e.personnel === personnel
  );
}
