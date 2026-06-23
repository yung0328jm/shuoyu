import { ExpenseEntry, ExpenseStatus } from "./types";
import { getDocument, setDocument } from "./data-sync";
import { isSupabaseEnabled } from "./supabase/client";

const EXPENSES_KEY = "shuoyu_expenses";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getExpenses(): ExpenseEntry[] {
  if (isSupabaseEnabled()) return getDocument("expenses", []);
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(EXPENSES_KEY);
  if (!raw) {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw);
}

export function saveExpenses(entries: ExpenseEntry[]) {
  if (isSupabaseEnabled()) {
    setDocument("expenses", entries);
    return;
  }
  if (!isBrowser()) return;
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(entries));
}

export function countsTowardTotal(entry: ExpenseEntry): boolean {
  if (entry.type === "expense") return entry.status === "confirmed";
  return entry.type === "purchase" && entry.status === "approved";
}

export function addExpenseEntry(
  data: Omit<ExpenseEntry, "id" | "createdAt" | "status"> & {
    type: ExpenseEntry["type"];
  }
): ExpenseEntry {
  const entry: ExpenseEntry = {
    ...data,
    id: `exp${Date.now()}`,
    status: data.type === "expense" ? "confirmed" : "pending",
    createdAt: new Date().toISOString(),
  };
  saveExpenses([entry, ...getExpenses()]);
  return entry;
}

export function updateExpenseStatus(
  id: string,
  status: ExpenseStatus,
  reviewer?: { id: string; name: string }
): boolean {
  const all = getExpenses();
  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  all[idx] = {
    ...all[idx],
    status,
    reviewedAt: reviewer ? new Date().toISOString() : all[idx].reviewedAt,
    reviewedBy: reviewer?.name ?? all[idx].reviewedBy,
  };
  saveExpenses(all);
  return true;
}

export function deleteExpenseEntry(id: string): boolean {
  const all = getExpenses();
  if (!all.some((e) => e.id === id)) return false;
  saveExpenses(all.filter((e) => e.id !== id));
  return true;
}

export function getPendingPurchaseCount(): number {
  return getExpenses().filter(
    (e) => e.type === "purchase" && e.status === "pending"
  ).length;
}

export interface SiteExpenseTotal {
  site: string;
  total: number;
  count: number;
}

export function calcExpenseTotals(
  entries: ExpenseEntry[],
  siteFilter?: string
): { bySite: SiteExpenseTotal[]; grandTotal: number } {
  const filtered = entries.filter((e) => {
    if (!countsTowardTotal(e)) return false;
    if (siteFilter && siteFilter !== "all" && e.site !== siteFilter) return false;
    return true;
  });

  const map = new Map<string, { total: number; count: number }>();
  for (const e of filtered) {
    const cur = map.get(e.site) ?? { total: 0, count: 0 };
    map.set(e.site, {
      total: cur.total + e.amount,
      count: cur.count + 1,
    });
  }

  const bySite = [...map.entries()]
    .map(([site, { total, count }]) => ({ site, total, count }))
    .sort((a, b) => b.total - a.total);

  const grandTotal = bySite.reduce((sum, s) => sum + s.total, 0);
  return { bySite, grandTotal };
}

export function formatCurrency(amount: number): string {
  return `NT$ ${amount.toLocaleString("zh-TW")}`;
}
