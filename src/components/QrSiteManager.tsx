"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { getSites, addSite, removeSite } from "@/lib/sites";
import { buildPunchUrl } from "@/lib/punch";

const inputClass =
  "w-full rounded border border-[#2a3548] bg-[#0d1117] px-3 py-2 text-sm text-white focus:border-[#f0c040] focus:outline-none";

export function QrSiteManager() {
  const [sites, setSites] = useState<string[]>([]);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [newSite, setNewSite] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    refresh();
  }, []);

  const refresh = async () => {
    const list = getSites();
    setSites(list);
    const map: Record<string, string> = {};
    for (const site of list) {
      const url = buildPunchUrl(site, window.location.origin);
      map[site] = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
    setQrMap(map);
  };

  const handleAdd = () => {
    if (addSite(newSite)) {
      setNewSite("");
      refresh();
    }
  };

  const handleRemove = (site: string) => {
    if (!confirm(`確定刪除案場「${site}」的 QR Code？`)) return;
    removeSite(site);
    refresh();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#8b95a5]">
        將 QR Code 列印後張貼於案場，員工掃描即可打卡上班
      </p>

      <div className="flex gap-2">
        <input
          className={inputClass}
          value={newSite}
          onChange={(e) => setNewSite(e.target.value)}
          placeholder="新增案場名稱..."
        />
        <button
          onClick={handleAdd}
          className="shrink-0 rounded bg-[#34d399] px-4 py-2 text-sm font-medium text-[#0a0e17]"
        >
          新增
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => (
          <div
            key={site}
            className="rounded-lg border border-[#2a3548] bg-[#111827] p-4 text-center"
          >
            <h4 className="mb-3 font-medium text-[#f0c040]">{site}</h4>
            {qrMap[site] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrMap[site]}
                alt={`${site} QR Code`}
                className="mx-auto rounded bg-white p-2"
              />
            )}
            <p className="mt-2 break-all text-[10px] text-[#5a6578]">
              {buildPunchUrl(site, origin)}
            </p>
            <button
              onClick={() => handleRemove(site)}
              className="mt-3 text-xs text-red-400 hover:underline"
            >
              刪除案場
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
