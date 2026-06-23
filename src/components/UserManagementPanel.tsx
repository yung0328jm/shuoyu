"use client";

import { useEffect, useState } from "react";
import { User, UserRole } from "@/lib/types";
import {
  getUsers,
  registerUser,
  updateUser,
  deleteUser,
  isRegistrationEnabled,
  setRegistrationEnabled,
} from "@/lib/storage";
import { useAuth } from "@/context/AuthContext";
import { useDataSyncVersion } from "@/hooks/useDataSyncVersion";

const inputClass =
  "w-full rounded border border-[#2a3548] bg-[#0d1117] px-3 py-2 text-sm text-white focus:border-[#f0c040] focus:outline-none";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "管理員",
  manager: "主管",
  employee: "員工",
};

export function UserManagementPanel() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    username: "",
    name: "",
    department: "工程部",
    password: "",
    role: "employee" as UserRole,
  });
  const [registrationOpen, setRegistrationOpen] = useState(false);

  const syncVersion = useDataSyncVersion();
  const refresh = () => setUsers(getUsers());

  useEffect(() => {
    refresh();
    setRegistrationOpen(isRegistrationEnabled());
  }, [syncVersion]);

  const resetForm = () => {
    setForm({
      username: "",
      name: "",
      department: "工程部",
      password: "",
      role: "employee",
    });
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.username || !form.name || !form.department) {
      setError("請填寫所有必填欄位");
      return;
    }

    if (editingId) {
      const updates: Partial<User> = {
        username: form.username,
        name: form.name,
        department: form.department,
        role: form.role,
      };
      if (form.password) updates.password = form.password;
      const ok = await updateUser(editingId, updates);
      if (!ok) {
        setError("更新失敗，帳號可能重複");
        return;
      }
      setMessage("員工資料已更新");
    } else {
      if (!form.password || form.password.length < 6) {
        setError("密碼至少需要 6 個字元");
        return;
      }
      const created = await registerUser(form);
      if (!created) {
        setError("帳號已被使用");
        return;
      }
      setMessage(`已建立帳號：${created.name}（${created.username}）`);
    }

    refresh();
    resetForm();
    setTimeout(() => setMessage(""), 3000);
  };

  const handleEdit = (u: User) => {
    setForm({
      username: u.username,
      name: u.name,
      department: u.department,
      password: "",
      role: u.role,
    });
    setEditingId(u.id);
    setShowForm(true);
  };

  const handleDelete = async (u: User) => {
    if (u.role === "admin") return;
    if (!confirm(`確定要刪除 ${u.name} 的帳號嗎？`)) return;
    await deleteUser(u.id);
    refresh();
    setMessage(`已刪除 ${u.name}`);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleRegistrationToggle = () => {
    const next = !registrationOpen;
    setRegistrationEnabled(next);
    setRegistrationOpen(next);
    setMessage(next ? "已開放自行註冊" : "已關閉自行註冊");
    setTimeout(() => setMessage(""), 3000);
  };

  const employees = users.filter((u) => u.role === "employee");
  const admins = users.filter((u) => u.role !== "employee");

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded border border-[#34d399]/30 bg-[#34d399]/10 px-4 py-2 text-sm text-[#34d399]">
          {message}
        </div>
      )}

      {currentUser?.role === "admin" && (
        <div className="flex items-center justify-between rounded border border-[#2a3548] bg-[#111827] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-white">開放自行註冊</p>
            <p className="text-xs text-[#5a6578]">
              關閉時登入頁不顯示註冊連結，新帳號僅能由管理員建立
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={registrationOpen}
            onClick={handleRegistrationToggle}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              registrationOpen ? "bg-[#34d399]" : "bg-[#2a3548]"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                registrationOpen ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-[#8b95a5]">
          共 {employees.length} 位員工 · 行事曆排程人員需與「姓名」一致，報酬單才能自動帶入
        </p>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="rounded bg-[#f0c040] px-4 py-2 text-sm font-medium text-[#1a1a1a] hover:bg-[#d4a830]"
        >
          + 新增員工帳號
        </button>
      </div>

      {showForm && (
        <div className="rounded border border-[#2a3548] bg-[#111827] p-6">
          <h3 className="mb-4 text-base font-medium text-[#f0c040]">
            {editingId ? "編輯員工" : "新增員工帳號"}
          </h3>
          {error && (
            <div className="mb-4 rounded bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="姓名 *" hint="需與行事曆排程人員名稱一致">
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例：蘇毓詠"
              />
            </Field>
            <Field label="帳號 *">
              <input
                className={inputClass}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="例：su_yuyong"
              />
            </Field>
            <Field label="部門 *">
              <input
                className={inputClass}
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </Field>
            <Field label={editingId ? "新密碼（留空不變更）" : "密碼 *"}>
              <input
                type="password"
                className={inputClass}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            <Field label="角色">
              <select
                className={inputClass}
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as UserRole })
                }
                disabled={!!editingId && editingId === currentUser?.id}
              >
                <option value="employee">員工</option>
                <option value="manager">主管</option>
                {currentUser?.role === "admin" && (
                  <option value="admin">管理員</option>
                )}
              </select>
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSubmit}
              className="rounded bg-[#34d399] px-5 py-2 text-sm font-medium text-[#0a0e17]"
            >
              {editingId ? "儲存" : "建立帳號"}
            </button>
            <button
              onClick={resetForm}
              className="rounded border border-[#2a3548] px-5 py-2 text-sm text-[#8b95a5]"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <UserTable
        title="員工列表"
        users={employees}
        onEdit={handleEdit}
        onDelete={handleDelete}
        currentUserId={currentUser?.id}
      />

      {admins.length > 0 && (
        <UserTable
          title="管理層"
          users={admins}
          onEdit={handleEdit}
          onDelete={handleDelete}
          currentUserId={currentUser?.id}
        />
      )}
    </div>
  );
}

function UserTable({
  title,
  users,
  onEdit,
  onDelete,
  currentUserId,
}: {
  title: string;
  users: User[];
  onEdit: (u: User) => void;
  onDelete: (u: User) => void;
  currentUserId?: string;
}) {
  return (
    <div className="overflow-hidden rounded border border-[#2a3548]">
      <div className="border-b border-[#2a3548] bg-[#111827] px-4 py-3 text-sm font-medium text-[#f0c040]">
        {title}（{users.length}）
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#2a3548] bg-[#0a0e17] text-xs text-[#8b95a5]">
            <tr>
              <th className="px-4 py-3">姓名</th>
              <th className="px-4 py-3">帳號</th>
              <th className="px-4 py-3">部門</th>
              <th className="px-4 py-3">角色</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a2234] bg-[#0d1117]">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#5a6578]">
                  尚無資料
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-[#111827]">
                  <td className="px-4 py-3 font-medium text-white">{u.name}</td>
                  <td className="px-4 py-3 text-[#c8cdd5]">{u.username}</td>
                  <td className="px-4 py-3 text-[#8b95a5]">{u.department}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-[#1a2234] px-2 py-0.5 text-xs text-[#c8cdd5]">
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(u)}
                        className="text-xs text-[#f0c040] hover:underline"
                      >
                        編輯
                      </button>
                      {u.id !== currentUserId && u.role !== "admin" && (
                        <button
                          onClick={() => onDelete(u)}
                          className="text-xs text-red-400 hover:underline"
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
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-[#8b95a5]">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-[#5a6578]">{hint}</p>}
    </div>
  );
}
