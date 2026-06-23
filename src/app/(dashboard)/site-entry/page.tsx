"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { SiteEntryPanel } from "@/components/SiteEntryPanel";

export default function SiteEntryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role !== "admin") {
      router.replace("/calendar");
    }
  }, [user, loading, router]);

  if (loading || user?.role !== "admin") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[#8b95a5]">
        載入中...
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-2 text-2xl font-bold text-[#f0c040]">入廠異動申請</h1>
      <p className="mb-6 text-sm text-[#8b95a5]">
        管理員可排程案場人員，並異動進離廠時間（一般人員請使用 QR 掃描打卡）
      </p>
      <SiteEntryPanel />
    </div>
  );
}
