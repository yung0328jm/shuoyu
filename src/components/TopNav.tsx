"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getPendingApprovalCount } from "@/components/ApprovalsPanel";
import { getPendingTodoCount } from "@/lib/todos";
import { useEffect, useState } from "react";
import { useDataSyncVersion } from "@/hooks/useDataSyncVersion";
import { UserRole } from "@/lib/types";

const navItems: {
  href: string;
  label: string;
  icon: string;
  roles?: readonly UserRole[];
}[] = [
  { href: "/calendar", label: "行事曆", icon: "📅" },
  { href: "/todos", label: "代辦事項", icon: "☑️" },
  { href: "/site-entry", label: "入廠異動申請", icon: "🏗", roles: ["admin"] },
  { href: "/approvals", label: "待審核", icon: "✅", roles: ["admin", "manager"] },
  { href: "/remuneration", label: "勞務報酬單", icon: "📄" },
  { href: "/attendance", label: "出勤紀錄", icon: "🕐" },
  { href: "/punch", label: "出勤打卡", icon: "📱" },
  { href: "/expenses", label: "支出管理", icon: "💰" },
  { href: "/users", label: "用戶管理", icon: "👥", roles: ["admin", "manager"] },
];

export function TopNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [todoCount, setTodoCount] = useState(0);

  const syncVersion = useDataSyncVersion();

  useEffect(() => {
    setPendingCount(getPendingApprovalCount());
    setTodoCount(getPendingTodoCount());
  }, [pathname, syncVersion]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="border-b border-[#2a3548] bg-[#0d1117]">
      <div className="nav-scroll flex items-center gap-1 overflow-x-auto px-4 py-2">
        {navItems
          .filter(
            (item) =>
              !("roles" in item) ||
              (user && item.roles?.includes(user.role))
          )
          .map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex shrink-0 items-center gap-1.5 rounded px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-[#f0c040] text-[#1a1a1a]"
                  : "text-[#c8cdd5] hover:bg-[#1a2234] hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
              {item.href === "/approvals" && pendingCount > 0 && !active && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
              {item.href === "/todos" && todoCount > 0 && !active && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f0c040] px-1 text-[10px] font-bold text-[#1a1a1a]">
                  {todoCount}
                </span>
              )}
            </Link>
          );
        })}

        <div className="ml-auto flex shrink-0 items-center gap-3 pl-4">
          <span className="hidden text-xs text-[#8b95a5] sm:inline">
            {user?.name}
          </span>
          <button
            onClick={handleLogout}
            className="shrink-0 rounded px-3 py-1.5 text-xs text-[#8b95a5] transition-colors hover:bg-[#1a2234] hover:text-white"
          >
            登出
          </button>
        </div>
      </div>
    </header>
  );
}
