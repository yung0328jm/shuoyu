"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { addTodo, deleteTodo, getTodos, toggleTodo } from "@/lib/todos";
import { TodoItem } from "@/lib/types";
import { useDataSyncVersion } from "@/hooks/useDataSyncVersion";

export function TodoPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<TodoItem[]>([]);
  const [input, setInput] = useState("");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [message, setMessage] = useState("");

  const syncVersion = useDataSyncVersion();

  const refresh = () => {
    setItems(
      getTodos().sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return b.createdAt.localeCompare(a.createdAt);
      })
    );
  };

  useEffect(() => {
    refresh();
  }, [syncVersion]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) {
      setMessage("請輸入代辦事項");
      return;
    }
    addTodo(text, user ? { id: user.id, name: user.name } : undefined);
    setInput("");
    setMessage("");
    refresh();
  };

  const handleToggle = (id: string) => {
    toggleTodo(id);
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteTodo(id);
    refresh();
  };

  const visible = hideCompleted ? items.filter((t) => !t.completed) : items;
  const pendingCount = items.filter((t) => !t.completed).length;
  const doneCount = items.filter((t) => t.completed).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between text-sm text-[#8b95a5]">
        <span>
          待完成 {pendingCount} 項
          {doneCount > 0 && ` · 已完成 ${doneCount} 項`}
        </span>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={(e) => setHideCompleted(e.target.checked)}
            className="rounded"
          />
          隱藏已完成
        </label>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="新增代辦事項…"
          className="flex-1 rounded border border-[#2a3548] bg-[#111827] px-4 py-3 text-sm text-white placeholder-[#5a6578] focus:border-[#f0c040] focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded bg-[#f0c040] px-5 py-3 text-sm font-medium text-[#1a1a1a] hover:bg-[#d4a830]"
        >
          新增
        </button>
      </form>

      {message && (
        <p className="text-sm text-red-400">{message}</p>
      )}

      <ul className="divide-y divide-[#1a2234] overflow-hidden rounded-lg border border-[#2a3548] bg-[#111827]">
        {visible.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-[#5a6578]">
            {hideCompleted && doneCount > 0
              ? "所有代辦事項都已完成"
              : "尚無代辦事項，請在上方新增"}
          </li>
        ) : (
          visible.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 px-4 py-3 hover:bg-[#0d1117]"
            >
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => handleToggle(item.id)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#2a3548] accent-[#f0c040]"
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm leading-relaxed ${
                    item.completed
                      ? "text-[#5a6578] line-through"
                      : "text-[#c8cdd5]"
                  }`}
                >
                  {item.text}
                </p>
                {item.createdByName && (
                  <p className="mt-0.5 text-[10px] text-[#5a6578]">
                    {item.createdByName}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="shrink-0 rounded px-2 py-1.5 text-xs font-medium text-red-400 hover:bg-red-400/10 hover:text-red-300"
                title="刪除"
              >
                刪除
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
