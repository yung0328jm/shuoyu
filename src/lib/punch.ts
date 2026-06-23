import { AttendanceRecord, AttendanceStatus } from "./types";
import { getAttendanceRecords, saveAttendanceRecords } from "./storage";
import { registerLaborEntry, registerLaborExit } from "./site-entry";
import { syncAutoEmergencyEntry, calcNetWorkHoursFromTimes } from "./emergency-hours";
import { getSiteLateTime } from "./site-late-settings";

export type PunchAction = "in" | "out";

export type PunchResult =
  | { ok: true; action: PunchAction; record: AttendanceRecord }
  | { ok: false; message: string };

export function getTodayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getNowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function calcStatus(checkIn: string, site?: string): AttendanceStatus {
  const threshold = site ? getSiteLateTime(site) : "08:00";
  return checkIn > threshold ? "late" : "normal";
}

export function getTodayRecord(userId: string, site?: string) {
  const today = getTodayDateStr();
  const records = getAttendanceRecords().filter(
    (r) => r.userId === userId && r.date === today
  );
  if (site) {
    return records.find((r) => r.site === site) || null;
  }
  return records[0] || null;
}

export function buildPunchUrl(site: string, origin?: string) {
  const base =
    origin ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  return `${base}/punch?site=${encodeURIComponent(site)}`;
}

export function parseQrPayload(raw: string): string | null {
  const text = raw.trim();
  try {
    if (text.startsWith("http")) {
      const url = new URL(text);
      const site = url.searchParams.get("site");
      if (site) return decodeURIComponent(site);
      if (url.pathname.includes("/punch")) {
        return url.searchParams.get("site") || null;
      }
    }
    const json = JSON.parse(text) as { site?: string; type?: string };
    if (json.site) return json.site;
  } catch {
    // plain site name
  }
  if (text.length > 0 && text.length < 50 && !text.includes("\n")) {
    return text;
  }
  return null;
}

export function clockIn(
  userId: string,
  userName: string,
  site: string
): { ok: true; record: AttendanceRecord } | { ok: false; message: string } {
  const today = getTodayDateStr();
  const now = getNowTimeStr();
  const existing = getTodayRecord(userId, site);

  if (existing?.checkIn) {
    return {
      ok: false,
      message: `今日已在「${site}」打卡上班（${existing.checkIn}）`,
    };
  }

  const record: AttendanceRecord = {
    id: `att-${Date.now()}`,
    userId,
    userName,
    date: today,
    checkIn: now,
    checkOut: "",
    hours: 0,
    site,
    status: calcStatus(now, site),
  };

  saveAttendanceRecords([record, ...getAttendanceRecords()]);
  return { ok: true, record };
}

export function clockOut(
  userId: string,
  site: string
): { ok: true; record: AttendanceRecord } | { ok: false; message: string } {
  const today = getTodayDateStr();
  const now = getNowTimeStr();
  const all = getAttendanceRecords();
  const idx = all.findIndex(
    (r) =>
      r.userId === userId &&
      r.date === today &&
      r.site === site &&
      r.checkIn &&
      !r.checkOut
  );

  if (idx === -1) {
    return { ok: false, message: "找不到今日上班紀錄，請先掃描 QR 打卡" };
  }

  const rec = all[idx];
  const hours = calcNetWorkHoursFromTimes(rec.checkIn, now);

  let status: AttendanceStatus = calcStatus(rec.checkIn, site);
  if (hours > 8) status = "overtime";
  else if (hours < 8 && now < "17:00") status = "early_leave";

  const updated: AttendanceRecord = {
    ...rec,
    checkOut: now,
    hours,
    status,
  };

  const next = [...all];
  next[idx] = updated;
  saveAttendanceRecords(next);

  syncAutoEmergencyEntry({
    date: today,
    personnel: rec.userName,
    startTime: rec.checkIn,
    endTime: now,
    applicant: rec.userName,
    totalHours: hours,
  });

  return { ok: true, record: updated };
}

/** 掃描 QR：同日同案場第一次進廠、第二次離廠，並同步行事曆 */
export function punchAtSite(
  userId: string,
  userName: string,
  site: string
): PunchResult {
  const existing = getTodayRecord(userId, site);

  if (!existing?.checkIn) {
    const result = clockIn(userId, userName, site);
    if (!result.ok) return result;
    registerLaborEntry(
      result.record.date,
      site,
      userId,
      userName,
      result.record.checkIn,
      userName
    );
    return { ok: true, action: "in", record: result.record };
  }

  if (!existing.checkOut) {
    const result = clockOut(userId, site);
    if (!result.ok) return result;
    registerLaborExit(
      result.record.date,
      site,
      userId,
      userName,
      result.record.checkOut,
      userName
    );
    return { ok: true, action: "out", record: result.record };
  }

  return {
    ok: false,
    message: `今日已在「${site}」完成進離廠（${existing.checkIn} → ${existing.checkOut}）`,
  };
}
