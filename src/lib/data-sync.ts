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
  | "contractors"
  | "app_settings";

const SYNC_CHANNEL = "shuoyu-sync";
const POLL_INTERVAL_MS = 30_000;

const cache = new Map<string, unknown>();
let profilesCache: User[] = [];
let ready = false;
let syncing = false;
let channelReady = false;
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

async function reloadDocument(key: DocumentKey) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("app_documents")
    .select("data")
    .eq("id", key)
    .single();
  if (!error && data) {
    cache.set(key, data.data);
    notify();
  }
}

async function broadcastDocUpdate(key: DocumentKey) {
  if (!channel || !channelReady) return;
  await channel.send({
    type: "broadcast",
    event: "doc-updated",
    payload: { key },
  });
}

async function persistDocument(key: DocumentKey, data: unknown) {
  const supabase = createClient();
  const { error } = await supabase.from("app_documents").upsert({
    id: key,
    data,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error(`[data-sync] save ${key} failed:`, error.message);
    return;
  }
  await broadcastDocUpdate(key);
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
let onlineHandler: (() => void) | null = null;

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
    .channel(SYNC_CHANNEL, {
      config: { broadcast: { self: false } },
    })
    .on("broadcast", { event: "doc-updated" }, ({ payload }) => {
      const key = (payload as { key?: DocumentKey })?.key;
      if (key) void reloadDocument(key);
      else void loadAllData();
    })
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "app_documents" },
      (payload) => {
        const row = payload.new as { id?: string; data?: unknown } | null;
        if (row?.id && row.data !== undefined) {
          applyRemoteDocument(row);
        } else if (row?.id) {
          void reloadDocument(row.id as DocumentKey);
        }
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
      channelReady = status === "SUBSCRIBED";
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        channelReady = false;
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
  }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startVisibilitySync() {
  if (!isSupabaseEnabled() || typeof document === "undefined") return;

  if (!visibilityHandler) {
    visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        void loadAllData();
      }
    };
    document.addEventListener("visibilitychange", visibilityHandler);
    window.addEventListener("focus", visibilityHandler);
  }

  if (!onlineHandler) {
    onlineHandler = () => void loadAllData();
    window.addEventListener("online", onlineHandler);
  }
}

function stopVisibilitySync() {
  if (visibilityHandler && typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", visibilityHandler);
    window.removeEventListener("focus", visibilityHandler);
    visibilityHandler = null;
  }
  if (onlineHandler && typeof window !== "undefined") {
    window.removeEventListener("online", onlineHandler);
    onlineHandler = null;
  }
}

export function unsubscribeRealtime() {
  channelReady = false;
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
