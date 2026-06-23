"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  isDataReady,
  isDataSyncing,
  loadAllData,
  subscribeDataSync,
  subscribeRealtime,
  unsubscribeRealtime,
  resetDataSync,
} from "@/lib/data-sync";
import { isSupabaseEnabled } from "@/lib/supabase/client";

interface DataSyncContextValue {
  version: number;
  syncing: boolean;
}

const DataSyncContext = createContext<DataSyncContextValue>({
  version: 0,
  syncing: false,
});

export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(!isSupabaseEnabled());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const unsub = subscribeDataSync(() => {
      setVersion((v) => v + 1);
      setSyncing(isDataSyncing());
    });
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseEnabled()) {
      setReady(true);
      return;
    }

    if (!user) {
      resetDataSync();
      setReady(false);
      return;
    }

    let active = true;
    setReady(false);
    setSyncing(true);

    loadAllData()
      .then(() => {
        if (!active) return;
        subscribeRealtime();
        setReady(isDataReady());
      })
      .finally(() => {
        if (active) setSyncing(false);
      });

    return () => {
      active = false;
      unsubscribeRealtime();
    };
  }, [user?.id]);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0a0e17]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#34d399] border-t-transparent" />
        <p className="text-sm text-[#8b95a5]">正在同步雲端資料…</p>
      </div>
    );
  }

  return (
    <DataSyncContext.Provider value={{ version, syncing }}>
      {children}
    </DataSyncContext.Provider>
  );
}

export function useDataSync() {
  return useContext(DataSyncContext);
}
