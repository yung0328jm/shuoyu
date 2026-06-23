"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function RoleGuard({
  roles,
  children,
}: {
  roles: string[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !roles.includes(user.role)) {
      router.replace("/calendar");
    }
  }, [user, loading, roles, router]);

  if (loading) return null;
  if (!user || !roles.includes(user.role)) return null;

  return <>{children}</>;
}
