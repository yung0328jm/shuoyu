import { AttendanceTable } from "@/components/AttendanceTable";

export default function AttendancePage() {
  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-[#f0c040]">出勤紀錄</h1>
      <AttendanceTable />
    </div>
  );
}
