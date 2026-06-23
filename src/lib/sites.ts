const DEFAULT_SITES = ["中壢日月光"];

import { getDocument, setDocument } from "./data-sync";
import { isSupabaseEnabled } from "./supabase/client";

const SITES_KEY = "shuoyu_sites";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getSites(): string[] {
  if (isSupabaseEnabled()) {
    return getDocument("sites", DEFAULT_SITES);
  }
  if (!isBrowser()) return DEFAULT_SITES;
  const raw = localStorage.getItem(SITES_KEY);
  if (!raw) {
    localStorage.setItem(SITES_KEY, JSON.stringify(DEFAULT_SITES));
    return DEFAULT_SITES;
  }
  return JSON.parse(raw);
}

export function saveSites(sites: string[]) {
  if (isSupabaseEnabled()) {
    setDocument("sites", sites);
    return;
  }
  if (!isBrowser()) return;
  localStorage.setItem(SITES_KEY, JSON.stringify(sites));
}

export function addSite(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const sites = getSites();
  if (sites.includes(trimmed)) return false;
  saveSites([...sites, trimmed]);
  return true;
}

export function removeSite(name: string) {
  saveSites(getSites().filter((s) => s !== name));
}
