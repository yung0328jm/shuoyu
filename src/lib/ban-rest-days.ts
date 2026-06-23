import { getDocument, setDocument } from "./data-sync";
import { isSupabaseEnabled } from "./supabase/client";

const BAN_REST_KEY = "shuoyu_ban_rest_days";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getBanRestDays(): string[] {
  if (isSupabaseEnabled()) return getDocument("ban_rest_days", []);
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(BAN_REST_KEY);
  if (!raw) {
    localStorage.setItem(BAN_REST_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw);
}

export function saveBanRestDays(dates: string[]) {
  if (isSupabaseEnabled()) {
    setDocument("ban_rest_days", dates);
    return;
  }
  if (!isBrowser()) return;
  localStorage.setItem(BAN_REST_KEY, JSON.stringify(dates));
}

export function isBanRestDay(date: string): boolean {
  return getBanRestDays().includes(date);
}

export function toggleBanRestDay(date: string): boolean {
  const list = getBanRestDays();
  if (list.includes(date)) {
    saveBanRestDays(list.filter((d) => d !== date));
    return false;
  }
  saveBanRestDays([...list, date].sort());
  return true;
}

export function formatSlashDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${y}/${m}/${d}`;
}
