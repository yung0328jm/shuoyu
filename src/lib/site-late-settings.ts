import { getSites } from "./sites";
import { getDocument, setDocument } from "./data-sync";
import { isSupabaseEnabled } from "./supabase/client";

const LATE_TIMES_KEY = "shuoyu_site_late_times";
export const DEFAULT_LATE_TIME = "08:00";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getSiteLateTimesMap(): Record<string, string> {
  if (isSupabaseEnabled()) return getDocument("site_late_times", {});
  if (!isBrowser()) return {};
  const raw = localStorage.getItem(LATE_TIMES_KEY);
  if (!raw) {
    localStorage.setItem(LATE_TIMES_KEY, JSON.stringify({}));
    return {};
  }
  return JSON.parse(raw);
}

export function saveSiteLateTimesMap(map: Record<string, string>) {
  if (isSupabaseEnabled()) {
    setDocument("site_late_times", map);
    return;
  }
  if (!isBrowser()) return;
  localStorage.setItem(LATE_TIMES_KEY, JSON.stringify(map));
}

export function getSiteLateTime(site: string): string {
  return getSiteLateTimesMap()[site] ?? DEFAULT_LATE_TIME;
}

export function setSiteLateTime(site: string, time: string): boolean {
  const normalized = normalizeLateTime(time);
  if (!normalized) return false;
  const map = getSiteLateTimesMap();
  map[site] = normalized;
  saveSiteLateTimesMap(map);
  return true;
}

export function normalizeLateTime(time: string): string | null {
  const trimmed = time.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getAllSiteLateSettings(): { site: string; lateTime: string }[] {
  return getSites().map((site) => ({
    site,
    lateTime: getSiteLateTime(site),
  }));
}
