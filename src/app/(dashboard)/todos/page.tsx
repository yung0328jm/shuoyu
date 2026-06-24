import { TodoPanel } from "@/components/TodoPanel";

export default function TodosPage() {
  return (
    <div className="p-6">
      <h1 className="mb-2 text-2xl font-bold text-[#f0c040]">代辦事項</h1>
      <p className="mb-6 text-sm text-[#8b95a5]">
        逐項勾選完成，資料即時同步至所有使用者
      </p>
      <TodoPanel />
    </div>
  );
}
