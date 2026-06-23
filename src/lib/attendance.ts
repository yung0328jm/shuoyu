import { AttendanceRecord, AttendanceStatus } from "./types";
import { getAttendanceRecords, saveAttendanceRecords } from "./storage";
import { getSiteLateTime } from "./site-late-settings";

export function resolveAttendanceStatus(record: AttendanceRecord): AttendanceStatus {
  const lateThreshold = getSiteLateTime(record.site);

  if (record.checkOut) {
    if (record.hours > 8) return "overtime";
    if (record.hours < 8 && record.checkOut < "17:00") return "early_leave";
  }

  if (record.checkIn > lateThreshold) return "late";
  return "normal";
}

export function deleteAttendanceRecord(id: string): boolean {
  const all = getAttendanceRecords();
  if (!all.some((r) => r.id === id)) return false;
  saveAttendanceRecords(all.filter((r) => r.id !== id));
  return true;
}
