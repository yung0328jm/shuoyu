"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { fetchRegistrationEnabled } from "@/lib/storage";

export default function LoginPage() {
  const { login, rememberedAccount } = useAuth();
  const router = useRouter();
  const [account, setAccount] = useState(rememberedAccount);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(!!rememberedAccount);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);

  useEffect(() => {
    void fetchRegistrationEnabled().then(setRegistrationEnabled);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const ok = await login(account.trim(), password, remember);
    setLoading(false);

    if (ok) {
      router.push("/calendar");
    } else {
      setError("帳號或密碼錯誤");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0e17] px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#f0c040]">礫宇事業群</h1>
          <p className="mt-2 text-[#8b95a5]">企業管理系統</p>
        </div>

        <div className="rounded-lg border border-[#2a3548] bg-[#111827] p-8">
          <h2 className="mb-6 text-lg font-medium text-white">登入</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm text-[#8b95a5]">帳號</label>
              <input
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="請輸入帳號"
                required
                className="w-full rounded border border-[#2a3548] bg-[#0d1117] px-4 py-3 text-sm text-white placeholder-[#5a6578] focus:border-[#f0c040] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#8b95a5]">密碼</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入密碼"
                required
                className="w-full rounded border border-[#2a3548] bg-[#0d1117] px-4 py-3 text-sm text-white placeholder-[#5a6578] focus:border-[#f0c040] focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-[#8b95a5]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-[#2a3548]"
              />
              記住帳號
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-[#f0c040] py-3 text-sm font-medium text-[#1a1a1a] hover:bg-[#d4a830] disabled:opacity-50"
            >
              {loading ? "登入中..." : "登錄"}
            </button>
          </form>

          {registrationEnabled && (
            <p className="mt-6 text-center text-sm text-[#5a6578]">
              還沒有帳號？
              <Link href="/register" className="ml-1 text-[#f0c040] hover:underline">
                立即註冊
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
