import { AuthGuard } from "@/components/AuthGuard";
import { TopNav } from "@/components/TopNav";
import { DataSyncProvider } from "@/context/DataSyncContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DataSyncProvider>
        <div className="flex min-h-screen flex-col bg-[#0a0e17]">
          <TopNav />
          <main className="flex-1">{children}</main>
        </div>
      </DataSyncProvider>
    </AuthGuard>
  );
}
