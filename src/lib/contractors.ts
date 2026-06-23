import { getDocument, setDocument } from "./data-sync";
import { isSupabaseEnabled } from "./supabase/client";

const CONTRACTORS_KEY = "shuoyu_contractors";
const DEFAULT_CONTRACTORS = ["小豪", "大偉"];

function isBrowser() {
  return typeof window !== "undefined";
}

export function getContractors(): string[] {
  if (isSupabaseEnabled()) return getDocument("contractors", DEFAULT_CONTRACTORS);
  if (!isBrowser()) return DEFAULT_CONTRACTORS;
  const raw = localStorage.getItem(CONTRACTORS_KEY);
  if (!raw) {
    localStorage.setItem(CONTRACTORS_KEY, JSON.stringify(DEFAULT_CONTRACTORS));
    return DEFAULT_CONTRACTORS;
  }
  return JSON.parse(raw);
}

export function saveContractors(names: string[]) {
  if (isSupabaseEnabled()) {
    setDocument("contractors", names);
    return;
  }
  if (!isBrowser()) return;
  localStorage.setItem(CONTRACTORS_KEY, JSON.stringify(names));
}

export function addContractor(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const list = getContractors();
  if (list.includes(trimmed)) return false;
  saveContractors([...list, trimmed]);
  return true;
}
