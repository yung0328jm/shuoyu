import { TodoItem } from "./types";
import { getDocument, setDocument } from "./data-sync";
import { isSupabaseEnabled } from "./supabase/client";

const TODOS_KEY = "shuoyu_todos";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getTodos(): TodoItem[] {
  if (isSupabaseEnabled()) return getDocument("todos", []);
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(TODOS_KEY);
  if (!raw) {
    localStorage.setItem(TODOS_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw) as TodoItem[];
}

export function saveTodos(items: TodoItem[]) {
  if (isSupabaseEnabled()) {
    setDocument("todos", items);
    return;
  }
  if (!isBrowser()) return;
  localStorage.setItem(TODOS_KEY, JSON.stringify(items));
}

export function addTodo(
  text: string,
  creator?: { id: string; name: string }
): TodoItem {
  const item: TodoItem = {
    id: `todo-${Date.now()}`,
    text: text.trim(),
    completed: false,
    createdAt: new Date().toISOString(),
    createdBy: creator?.id,
    createdByName: creator?.name,
  };
  saveTodos([item, ...getTodos()]);
  return item;
}

export function toggleTodo(id: string): boolean {
  const all = getTodos();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  const next = !all[idx].completed;
  all[idx] = {
    ...all[idx],
    completed: next,
    completedAt: next ? new Date().toISOString() : undefined,
  };
  saveTodos(all);
  return true;
}

export function deleteTodo(id: string): boolean {
  const all = getTodos();
  const next = all.filter((t) => t.id !== id);
  if (next.length === all.length) return false;
  saveTodos(next);
  return true;
}

export function getPendingTodoCount(): number {
  return getTodos().filter((t) => !t.completed).length;
}
