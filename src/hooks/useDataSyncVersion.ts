"use client";

import { useDataSync } from "@/context/DataSyncContext";

/** 雲端資料變更時遞增，供元件 useEffect 依賴以重新讀取快取 */
export function useDataSyncVersion(): number {
  return useDataSync().version;
}
