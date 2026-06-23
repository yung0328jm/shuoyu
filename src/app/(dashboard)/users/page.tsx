import { UserManagementPanel } from "@/components/UserManagementPanel";
import { RoleGuard } from "@/components/RoleGuard";

export default function UsersPage() {
  return (
    <RoleGuard roles={["admin", "manager"]}>
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold text-[#f0c040]">用戶管理</h1>
        <UserManagementPanel />
      </div>
    </RoleGuard>
  );
}
