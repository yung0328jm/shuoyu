"use client";

import { useEffect, useState } from "react";
import { subscribeDataSync } from "@/lib/data-sync";

/** 資料雲端同步時遞增，供元件重新讀取快取 */
export function useDataSyncVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeDataSync(() => setVersion((v) => v + 1)), []);
  return version;
}
