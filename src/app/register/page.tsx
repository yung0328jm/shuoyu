"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const inputClass =
  "w-full rounded border border-[#2a3548] bg-[#0d1117] px-4 py-2.5 text-sm text-white focus:border-[#f0c040] focus:outline-none";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    name: "",
    department: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("兩次輸入的密碼不一致");
      return;
    }
    if (form.password.length < 6) {
      setError("密碼至少需要 6 個字元");
      return;
    }

    setLoading(true);
    const err = await register({
      username: form.username.trim(),
      name: form.name.trim(),
      department: form.department.trim(),
      password: form.password,
    });
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0e17] px-6 py-12">
      <div className="w-full max-w-md rounded-lg border border-[#2a3548] bg-[#111827] p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#f0c040]">爍宇事業群</h1>
          <p className="mt-1 text-sm text-[#8b95a5]">建立新帳號</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {(["username", "name", "department"] as const).map((field) => (
            <div key={field}>
              <label className="mb-1 block text-sm text-[#8b95a5]">
                {field === "username" ? "帳號" : field === "name" ? "姓名" : "部門"}
              </label>
              <input
                type="text"
                value={form[field]}
                onChange={(e) => update(field, e.target.value)}
                required
                className={inputClass}
              />
            </div>
          ))}

          <div>
            <label className="mb-1 block text-sm text-[#8b95a5]">密碼</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#8b95a5]">確認密碼</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-[#f0c040] py-3 text-sm font-medium text-[#1a1a1a] hover:bg-[#d4a830] disabled:opacity-50"
          >
            {loading ? "註冊中..." : "註冊"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#5a6578]">
          已有帳號？
          <Link href="/login" className="ml-1 text-[#f0c040] hover:underline">
            返回登入
          </Link>
        </p>
      </div>
    </div>
  );
}
