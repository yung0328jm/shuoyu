"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? "/calendar" : "/login");
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0e17]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#f0c040] border-t-transparent" />
    </div>
  );
}
