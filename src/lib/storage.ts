import {
  CalendarEvent,
  PendingEntry,
  RemunerationForm,
  AttendanceRecord,
  LeaveApplication,
  User,
  RemunerationParams,
  AppSettings,
} from "./types";
import { DEFAULT_REMUNERATION_PARAMS } from "./remuneration-calc";
import { DEMO_USERS } from "./demo-users";
import {
  DEMO_CALENDAR_EVENTS,
  DEMO_PENDING_ENTRIES,
  DEMO_ATTENDANCE,
  DEMO_REMUNERATION,
} from "./demo-data";
import {
  getDocument,
  setDocument,
  getProfilesCache,
  setProfilesCache,
  loadAllData,
} from "./data-sync";
import { createClient, toAuthEmail, isSupabaseEnabled } from "./supabase/client";

const AUTH_KEY = "shuoyu_auth";
const REMEMBER_KEY = "shuoyu_remember";

// localStorage fallback keys
const USERS_KEY = "shuoyu_users";
const EVENTS_KEY = "shuoyu_events";
const PENDING_KEY = "shuoyu_pending";
const ATTENDANCE_KEY = "shuoyu_attendance";
const REMUNERATION_KEY = "shuoyu_remuneration";
const LEAVES_KEY = "shuoyu_leaves";
const REMUNERATION_PARAMS_KEY = "shuoyu_remuneration_params";
const EMPLOYEE_PARAMS_KEY = "shuoyu_employee_params";
const APP_SETTINGS_KEY = "shuoyu_app_settings";

const DEFAULT_APP_SETTINGS: AppSettings = { registrationEnabled: false };

function isBrowser() {
  return typeof window !== "undefined";
}

function localGet<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function localSave<T>(key: string, data: T) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(data));
}

function localInitKey<T>(key: string, fallback: T) {
  if (!isBrowser()) return;
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify(fallback));
  }
}

export function initStorage() {
  if (!isBrowser() || isSupabaseEnabled()) return;
  localInitKey(USERS_KEY, DEMO_USERS);
  localInitKey(EVENTS_KEY, DEMO_CALENDAR_EVENTS);
  localInitKey(PENDING_KEY, DEMO_PENDING_ENTRIES);
  localInitKey(ATTENDANCE_KEY, DEMO_ATTENDANCE);
  localInitKey(REMUNERATION_KEY, DEMO_REMUNERATION);
  localInitKey(LEAVES_KEY, []);
  localInitKey(EMPLOYEE_PARAMS_KEY, {});
  localInitKey(APP_SETTINGS_KEY, DEFAULT_APP_SETTINGS);
}

export function getUsers(): User[] {
  if (isSupabaseEnabled()) return getProfilesCache();
  initStorage();
  return localGet(USERS_KEY, DEMO_USERS);
}

export function saveUsers(users: User[]) {
  if (isSupabaseEnabled()) {
    setProfilesCache(users);
    return;
  }
  localSave(USERS_KEY, users);
}

export function getCalendarEvents(): CalendarEvent[] {
  if (isSupabaseEnabled()) return getDocument("events", []);
  initStorage();
  return localGet(EVENTS_KEY, DEMO_CALENDAR_EVENTS);
}

export function saveCalendarEvents(events: CalendarEvent[]) {
  if (isSupabaseEnabled()) {
    setDocument("events", events);
    return;
  }
  localSave(EVENTS_KEY, events);
}

export function getPendingEntries(): PendingEntry[] {
  if (isSupabaseEnabled()) return getDocument("pending", []);
  initStorage();
  return localGet(PENDING_KEY, DEMO_PENDING_ENTRIES);
}

export function savePendingEntries(entries: PendingEntry[]) {
  if (isSupabaseEnabled()) {
    setDocument("pending", entries);
    return;
  }
  localSave(PENDING_KEY, entries);
}

export function getAttendanceRecords(): AttendanceRecord[] {
  if (isSupabaseEnabled()) return getDocument("attendance", []);
  initStorage();
  return localGet(ATTENDANCE_KEY, DEMO_ATTENDANCE);
}

export function saveAttendanceRecords(records: AttendanceRecord[]) {
  if (isSupabaseEnabled()) {
    setDocument("attendance", records);
    return;
  }
  localSave(ATTENDANCE_KEY, records);
}

export function getRemunerationForms(): RemunerationForm[] {
  if (isSupabaseEnabled()) return getDocument("remuneration", []);
  initStorage();
  return localGet(REMUNERATION_KEY, DEMO_REMUNERATION);
}

export function saveRemunerationForms(forms: RemunerationForm[]) {
  if (isSupabaseEnabled()) {
    setDocument("remuneration", forms);
    return;
  }
  localSave(REMUNERATION_KEY, forms);
}

export function getLeaveApplications(): LeaveApplication[] {
  if (isSupabaseEnabled()) return getDocument("leaves", []);
  initStorage();
  return localGet(LEAVES_KEY, []);
}

export function saveLeaveApplications(leaves: LeaveApplication[]) {
  if (isSupabaseEnabled()) {
    setDocument("leaves", leaves);
    return;
  }
  localSave(LEAVES_KEY, leaves);
}

export function getRemunerationParams(): RemunerationParams {
  if (isSupabaseEnabled()) return DEFAULT_REMUNERATION_PARAMS;
  return localGet(REMUNERATION_PARAMS_KEY, DEFAULT_REMUNERATION_PARAMS);
}

export function saveRemunerationParams(params: RemunerationParams) {
  if (!isSupabaseEnabled()) {
    localSave(REMUNERATION_PARAMS_KEY, params);
  }
}

export function getEmployeeParamsMap(): Record<string, RemunerationParams> {
  if (isSupabaseEnabled()) return getDocument("employee_params", {});
  initStorage();
  return localGet(EMPLOYEE_PARAMS_KEY, {});
}

export function saveEmployeeParamsMap(map: Record<string, RemunerationParams>) {
  if (isSupabaseEnabled()) {
    setDocument("employee_params", map);
    return;
  }
  localSave(EMPLOYEE_PARAMS_KEY, map);
}

export function getAuthUser(): User | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

export function setAuthUser(user: User | null) {
  if (!isBrowser()) return;
  if (user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ ...user, password: "" }));
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

export function getRememberedAccount(): string {
  if (!isBrowser()) return "";
  return localStorage.getItem(REMEMBER_KEY) || "";
}

export function setRememberedAccount(account: string) {
  if (!isBrowser()) return;
  if (account) {
    localStorage.setItem(REMEMBER_KEY, account);
  } else {
    localStorage.removeItem(REMEMBER_KEY);
  }
}

export async function loginWithCredential(
  account: string,
  password: string
): Promise<User | null> {
  if (!isSupabaseEnabled()) {
    return findUserByCredential(account, password);
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: toAuthEmail(account),
    password,
  });
  if (error || !data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, name, department, role")
    .eq("id", data.user.id)
    .single();

  if (!profile) return null;

  const user: User = {
    id: profile.id,
    username: profile.username,
    name: profile.name,
    department: profile.department,
    role: profile.role,
    password: "",
  };
  setAuthUser(user);
  return user;
}

export function findUserByCredential(
  account: string,
  password: string
): User | null {
  const users = getUsers();
  return (
    users.find((u) => u.username === account && u.password === password) || null
  );
}

export async function registerUser(
  data: Omit<User, "id">
): Promise<User | null> {
  if (!isSupabaseEnabled()) {
    const users = getUsers();
    if (users.some((u) => u.username === data.username)) return null;
    const user: User = { ...data, id: `u${Date.now()}` };
    saveUsers([...users, user]);
    return user;
  }

  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  await loadAllData();
  const user = (await res.json()) as User;
  return user;
}

export async function updateUser(
  id: string,
  data: Partial<Omit<User, "id">>
): Promise<boolean> {
  if (!isSupabaseEnabled()) {
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    if (
      data.username &&
      users.some((u) => u.id !== id && u.username === data.username)
    ) {
      return false;
    }
    users[idx] = { ...users[idx], ...data };
    saveUsers(users);
    return true;
  }

  const res = await fetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res.ok) await loadAllData();
  return res.ok;
}

export async function deleteUser(id: string): Promise<boolean> {
  if (!isSupabaseEnabled()) {
    const users = getUsers();
    const target = users.find((u) => u.id === id);
    if (!target || target.role === "admin") return false;
    saveUsers(users.filter((u) => u.id !== id));
    return true;
  }

  const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
  if (res.ok) await loadAllData();
  return res.ok;
}

export async function selfRegister(data: {
  username: string;
  name: string;
  department: string;
  password: string;
}): Promise<string | null> {
  const enabled = await fetchRegistrationEnabled();
  if (!enabled) {
    return "目前未開放自行註冊，請聯絡管理員";
  }

  if (!isSupabaseEnabled()) {
    const created = await registerUser({ ...data, role: "employee" });
    return created ? null : "帳號已被使用";
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email: toAuthEmail(data.username),
    password: data.password,
    options: {
      data: {
        username: data.username,
        name: data.name,
        department: data.department,
        role: "employee",
      },
    },
  });
  if (error) return error.message;
  return null;
}

export function getEmployeeUsers(): User[] {
  return getUsers().filter((u) => u.role === "employee");
}

export function getAppSettings(): AppSettings {
  if (isSupabaseEnabled()) {
    return getDocument("app_settings", DEFAULT_APP_SETTINGS);
  }
  initStorage();
  return localGet(APP_SETTINGS_KEY, DEFAULT_APP_SETTINGS);
}

export function saveAppSettings(settings: AppSettings) {
  if (isSupabaseEnabled()) {
    setDocument("app_settings", settings);
    return;
  }
  localSave(APP_SETTINGS_KEY, settings);
}

export function isRegistrationEnabled(): boolean {
  return getAppSettings().registrationEnabled;
}

export function setRegistrationEnabled(enabled: boolean) {
  saveAppSettings({ ...getAppSettings(), registrationEnabled: enabled });
}

export async function fetchRegistrationEnabled(): Promise<boolean> {
  if (!isSupabaseEnabled()) {
    return isRegistrationEnabled();
  }
  try {
    const res = await fetch("/api/settings/registration");
    if (!res.ok) return false;
    const data = (await res.json()) as { registrationEnabled?: boolean };
    return data.registrationEnabled ?? false;
  } catch {
    return false;
  }
}

export async function logoutUser() {
  if (isSupabaseEnabled()) {
    const supabase = createClient();
    await supabase.auth.signOut();
  }
  setAuthUser(null);
}
