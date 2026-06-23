import { ExpensePanel } from "@/components/ExpensePanel";

export default function ExpensesPage() {
  return (
    <div className="p-6">
      <h1 className="mb-2 text-2xl font-bold text-[#f0c040]">支出管理</h1>
      <p className="mb-6 text-sm text-[#8b95a5]">
        登記案場支出或申請購買，管理員審核通過後計入合計
      </p>
      <ExpensePanel />
    </div>
  );
}
