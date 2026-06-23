import { User } from "./types";
import { createClient, isSupabaseEnabled } from "./supabase/client";

export type DocumentKey =
  | "events"
  | "pending"
  | "attendance"
  | "leaves"
  | "remuneration"
  | "employee_params"
  | "sites"
  | "site_late_times"
  | "ban_rest_days"
  | "expenses"
  | "contractors";

const cache = new Map<string, unknown>();
let profilesCache: User[] = [];
let ready = false;
let syncing = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeDataSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isDataReady() {
  return ready || !isSupabaseEnabled();
}

export function isDataSyncing() {
  return syncing;
}

export function getDocument<T>(key: DocumentKey, fallback: T): T {
  if (!cache.has(key)) return fallback;
  return cache.get(key) as T;
}

export function setDocument<T>(key: DocumentKey, data: T) {
  cache.set(key, data);
  notify();
  if (isSupabaseEnabled()) {
    void persistDocument(key, data);
  }
}

async function persistDocument(key: DocumentKey, data: unknown) {
  const supabase = createClient();
  const { error } = await supabase.from("app_documents").upsert({
    id: key,
    data,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error(`[data-sync] save ${key} failed:`, error.message);
}

export function getProfilesCache(): User[] {
  return profilesCache;
}

export function setProfilesCache(users: User[]) {
  profilesCache = users;
  notify();
}

export async function loadAllData(): Promise<void> {
  if (!isSupabaseEnabled()) {
    ready = true;
    return;
  }

  syncing = true;
  notify();

  try {
    const supabase = createClient();

    const [{ data: docs, error: docsError }, { data: profiles, error: profilesError }] =
      await Promise.all([
        supabase.from("app_documents").select("id, data"),
        supabase.from("profiles").select("id, username, name, department, role"),
      ]);

    if (docsError) throw docsError;
    if (profilesError) throw profilesError;

    cache.clear();
    for (const row of docs ?? []) {
      cache.set(row.id, row.data);
    }

    profilesCache = (profiles ?? []).map((p) => ({
      id: p.id,
      username: p.username,
      name: p.name,
      department: p.department,
      role: p.role as User["role"],
      password: "",
    }));

    ready = true;
  } finally {
    syncing = false;
    notify();
  }
}

let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let visibilityHandler: (() => void) | null = null;

function applyRemoteDocument(row: { id?: string; data?: unknown } | null) {
  if (row?.id) {
    cache.set(row.id, row.data);
    notify();
  }
}

export function subscribeRealtime() {
  if (!isSupabaseEnabled() || channel) return;

  const supabase = createClient();
  channel = supabase
    .channel("shuoyu-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "app_documents" },
      (payload) => {
        applyRemoteDocument(
          payload.new as { id?: string; data?: unknown } | null
        );
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "profiles" },
      () => {
        void refreshProfiles();
      }
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        void loadAllData();
      }
    });

  startPolling();
  startVisibilitySync();
}

function startPolling() {
  if (!isSupabaseEnabled() || pollTimer) return;
  pollTimer = setInterval(() => {
    void loadAllData();
  }, 4000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startVisibilitySync() {
  if (!isSupabaseEnabled() || visibilityHandler || typeof document === "undefined") {
    return;
  }
  visibilityHandler = () => {
    if (document.visibilityState === "visible") {
      void loadAllData();
    }
  };
  document.addEventListener("visibilitychange", visibilityHandler);
  window.addEventListener("focus", visibilityHandler);
}

function stopVisibilitySync() {
  if (visibilityHandler && typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", visibilityHandler);
    window.removeEventListener("focus", visibilityHandler);
    visibilityHandler = null;
  }
}

export function unsubscribeRealtime() {
  stopPolling();
  stopVisibilitySync();
  if (channel) {
    const supabase = createClient();
    void supabase.removeChannel(channel);
    channel = null;
  }
}

async function refreshProfiles() {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, name, department, role");
  profilesCache = (data ?? []).map((p) => ({
    id: p.id,
    username: p.username,
    name: p.name,
    department: p.department,
    role: p.role as User["role"],
    password: "",
  }));
  notify();
}

export function resetDataSync() {
  cache.clear();
  profilesCache = [];
  ready = false;
  unsubscribeRealtime();
}
