import { ApprovalsPanel } from "@/components/ApprovalsPanel";
import { RoleGuard } from "@/components/RoleGuard";

export default function ApprovalsPage() {
  return (
    <RoleGuard roles={["admin", "manager"]}>
      <div className="p-6">
        <h1 className="mb-2 text-2xl font-bold text-[#f0c040]">待審核</h1>
        <p className="mb-6 text-sm text-[#8b95a5]">
          審核員工的請假申請與緊急入場申報
        </p>
        <ApprovalsPanel />
      </div>
    </RoleGuard>
  );
}
