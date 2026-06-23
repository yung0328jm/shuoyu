"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getSites } from "@/lib/sites";
import {
  addExpenseEntry,
  calcExpenseTotals,
  deleteExpenseEntry,
  formatCurrency,
  getExpenses,
  updateExpenseStatus,
} from "@/lib/expenses";
import {
  ExpenseEntry,
  ExpenseEntryType,
  EXPENSE_STATUS_LABELS,
  EXPENSE_TYPE_LABELS,
} from "@/lib/types";
import { useDataSyncVersion } from "@/hooks/useDataSyncVersion";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "text-green-400 bg-green-400/10",
  pending: "text-yellow-400 bg-yellow-400/10",
  approved: "text-blue-400 bg-blue-400/10",
  rejected: "text-red-400 bg-red-400/10",
};

export function ExpensePanel() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [sites, setSites] = useState<string[]>([]);
  const [siteFilter, setSiteFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ExpenseEntryType>("all");
  const [formType, setFormType] = useState<ExpenseEntryType>("expense");
  const [formSite, setFormSite] = useState("");
  const [formItem, setFormItem] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formNote, setFormNote] = useState("");
  const [message, setMessage] = useState("");

  const isManager = user?.role === "admin" || user?.role === "manager";

  const refresh = () => {
    setSites(getSites());
    setEntries(
      getExpenses().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    );
  };

  const syncVersion = useDataSyncVersion();

  useEffect(() => {
    refresh();
  }, [syncVersion]);

  useEffect(() => {
    if (sites.length > 0 && !formSite) {
      setFormSite(sites[0]);
    }
  }, [sites, formSite]);

  const filtered = entries.filter((e) => {
    if (siteFilter !== "all" && e.site !== siteFilter) return false;
    if (typeFilter !== "all" && e.type !== typeFilter) return false;
    return true;
  });

  const { bySite, grandTotal } = calcExpenseTotals(entries, siteFilter);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amount = Number(formAmount);
    if (!formSite || !formItem.trim()) {
      setMessage("請填寫案場與項目");
      return;
    }
    if (!amount || amount <= 0) {
      setMessage("請輸入有效金額");
      return;
    }
    addExpenseEntry({
      site: formSite,
      item: formItem.trim(),
      amount,
      note: formNote.trim(),
      type: formType,
      userId: user.id,
      userName: user.name,
    });
    setFormItem("");
    setFormAmount("");
    setFormNote("");
    setMessage(
      formType === "expense"
        ? "支出已登記"
        : "購買申請已送出，待管理員審核"
    );
    refresh();
  };

  const handleApprove = (id: string, status: "approved" | "rejected") => {
    if (!user) return;
    updateExpenseStatus(id, status, { id: user.id, name: user.name });
    refresh();
  };

  const handleDelete = (entry: ExpenseEntry) => {
    if (!user) return;
    const canDelete =
      isManager ||
      (entry.userId === user.id &&
        entry.type === "purchase" &&
        entry.status === "pending");
    if (!canDelete) return;
    if (!confirm("確定要刪除此筆紀錄？")) return;
    deleteExpenseEntry(entry.id);
    refresh();
  };

  return (
    <div className="space-y-6">
      {/* 合計摘要 */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded border border-[#f0c040]/40 bg-[#1a1810] px-5 py-4 sm:col-span-2 lg:col-span-1">
          <div className="text-xs text-[#8b95a5]">所有案場合計支出</div>
          <div className="mt-1 text-2xl font-bold text-[#f0c040]">
            {formatCurrency(grandTotal)}
          </div>
          <div className="mt-1 text-xs text-[#8b95a5]">
            含已登記支出 + 已核准購買
          </div>
        </div>
        {bySite.map(({ site, total, count }) => (
          <div
            key={site}
            className="rounded border border-[#2a3548] bg-[#111827] px-5 py-4"
          >
            <div className="text-xs text-[#8b95a5]">{site}</div>
            <div className="mt-1 text-xl font-semibold text-white">
              {formatCurrency(total)}
            </div>
            <div className="mt-1 text-xs text-[#8b95a5]">{count} 筆</div>
          </div>
        ))}
        {bySite.length === 0 && (
          <div className="rounded border border-[#2a3548] bg-[#111827] px-5 py-4 text-sm text-[#8b95a5]">
            尚無計入合計的支出紀錄
          </div>
        )}
      </section>

      {/* 新增表單 */}
      <section className="rounded border border-[#2a3548] bg-[#111827] p-5">
        <h2 className="mb-4 text-sm font-medium text-[#f0c040]">新增紀錄</h2>
        <div className="mb-4 flex gap-2">
          {(["expense", "purchase"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFormType(t)}
              className={`rounded px-4 py-2 text-xs font-medium transition-colors ${
                formType === t
                  ? "bg-[#f0c040] text-[#1a1a1a]"
                  : "border border-[#2a3548] text-[#8b95a5] hover:text-white"
              }`}
            >
              {t === "expense" ? "登記支出" : "申請購買"}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block text-xs text-[#8b95a5]">
            案場
            <select
              value={formSite}
              onChange={(e) => setFormSite(e.target.value)}
              className="mt-1 w-full rounded border border-[#2a3548] bg-[#0d1117] px-3 py-2 text-sm text-white"
            >
              {sites.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-[#8b95a5] sm:col-span-2">
            項目
            <input
              value={formItem}
              onChange={(e) => setFormItem(e.target.value)}
              placeholder="例：安全帽、交通費"
              className="mt-1 w-full rounded border border-[#2a3548] bg-[#0d1117] px-3 py-2 text-sm text-white placeholder:text-[#4a5568]"
            />
          </label>
          <label className="block text-xs text-[#8b95a5]">
            金額（元）
            <input
              type="number"
              min="1"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0"
              className="mt-1 w-full rounded border border-[#2a3548] bg-[#0d1117] px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-[#8b95a5] sm:col-span-2 lg:col-span-1">
            備註
            <input
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="選填"
              className="mt-1 w-full rounded border border-[#2a3548] bg-[#0d1117] px-3 py-2 text-sm text-white placeholder:text-[#4a5568]"
            />
          </label>
          <div className="flex items-end sm:col-span-2 lg:col-span-5">
            <button
              type="submit"
              className="rounded bg-[#f0c040] px-6 py-2 text-sm font-medium text-[#1a1a1a] hover:bg-[#e0b030]"
            >
              {formType === "expense" ? "登記支出" : "送出購買申請"}
            </button>
            {message && (
              <span className="ml-4 text-xs text-green-400">{message}</span>
            )}
          </div>
        </form>
        {formType === "purchase" && (
          <p className="mt-3 text-xs text-[#8b95a5]">
            購買申請需經管理員審核通過後，才會計入案場支出合計。
          </p>
        )}
      </section>

      {/* 篩選 + 明細表 */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="rounded border border-[#2a3548] bg-[#111827] px-3 py-1.5 text-xs text-white"
          >
            <option value="all">全部案場</option>
            {sites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            {(["all", "expense", "purchase"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded px-3 py-1.5 text-xs transition-colors ${
                  typeFilter === t
                    ? "bg-[#f0c040] text-[#1a1a1a]"
                    : "border border-[#2a3548] text-[#8b95a5] hover:text-white"
                }`}
              >
                {t === "all" ? "全部類型" : EXPENSE_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded border border-[#2a3548]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#2a3548] bg-[#111827] text-xs text-[#8b95a5]">
                <tr>
                  <th className="px-4 py-3">日期</th>
                  <th className="px-4 py-3">案場</th>
                  <th className="px-4 py-3">類型</th>
                  <th className="px-4 py-3">項目</th>
                  <th className="px-4 py-3">金額</th>
                  <th className="px-4 py-3">申請人</th>
                  <th className="px-4 py-3">狀態</th>
                  <th className="px-4 py-3">備註</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2234] bg-[#0d1117]">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-[#8b95a5]"
                    >
                      尚無支出紀錄
                    </td>
                  </tr>
                ) : (
                  filtered.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[#111827]/50">
                      <td className="whitespace-nowrap px-4 py-3 text-[#c8cdd5]">
                        {entry.createdAt.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3 text-white">{entry.site}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            entry.type === "expense"
                              ? "bg-teal-900/40 text-teal-300"
                              : "bg-purple-900/40 text-purple-300"
                          }`}
                        >
                          {EXPENSE_TYPE_LABELS[entry.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white">{entry.item}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[#f0c040]">
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="px-4 py-3 text-[#c8cdd5]">
                        {entry.userName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${STATUS_COLORS[entry.status]}`}
                        >
                          {EXPENSE_STATUS_LABELS[entry.status]}
                        </span>
                      </td>
                      <td className="max-w-[120px] truncate px-4 py-3 text-xs text-[#8b95a5]">
                        {entry.note || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {isManager &&
                            entry.type === "purchase" &&
                            entry.status === "pending" && (
                              <>
                                <button
                                  onClick={() =>
                                    handleApprove(entry.id, "approved")
                                  }
                                  className="rounded bg-green-600 px-2 py-1 text-[10px] text-white hover:bg-green-500"
                                >
                                  核准
                                </button>
                                <button
                                  onClick={() =>
                                    handleApprove(entry.id, "rejected")
                                  }
                                  className="rounded bg-red-600 px-2 py-1 text-[10px] text-white hover:bg-red-500"
                                >
                                  駁回
                                </button>
                              </>
                            )}
                          {(isManager ||
                            (entry.userId === user?.id &&
                              entry.type === "purchase" &&
                              entry.status === "pending")) && (
                            <button
                              onClick={() => handleDelete(entry)}
                              className="rounded border border-[#2a3548] px-2 py-1 text-[10px] text-[#8b95a5] hover:text-red-400"
                            >
                              刪除
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
