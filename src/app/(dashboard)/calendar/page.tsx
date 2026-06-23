"use client";

import { useState } from "react";
import { CalendarView } from "@/components/CalendarView";
import { PendingPanel } from "@/components/PendingPanel";

export default function CalendarPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-[#f0c040]">行事曆</h1>
      <PendingPanel
        refreshKey={refreshKey}
        onUpdate={() => setRefreshKey((k) => k + 1)}
      />
      <CalendarView key={refreshKey} />
    </div>
  );
}
