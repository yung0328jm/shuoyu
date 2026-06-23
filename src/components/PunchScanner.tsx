"use client";

import { useEffect, useRef, useState } from "react";
import { parseQrPayload, punchAtSite, PunchAction } from "@/lib/punch";
import { useAuth } from "@/context/AuthContext";

interface PunchScannerProps {
  onSuccess: (site: string, time: string, action: PunchAction) => void;
  onError: (msg: string) => void;
}

export function PunchScanner({ onSuccess, onError }: PunchScannerProps) {
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null);
  const processingRef = useRef(false);
  const containerId = "qr-reader";

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
      } catch {
        /* ignore */
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScan = async (decoded: string) => {
    if (processingRef.current) return;
    const site = parseQrPayload(decoded);
    if (!site) {
      onError("無法辨識 QR Code，請掃描案場打卡 QR");
      return;
    }
    if (!user) {
      onError("請先登入");
      return;
    }
    processingRef.current = true;
    const result = punchAtSite(user.id, user.name, site);
    processingRef.current = false;
    if (result.ok) {
      await stopScanner();
      const time =
        result.action === "in" ? result.record.checkIn : result.record.checkOut;
      onSuccess(site, time, result.action);
    } else {
      onError(result.message);
    }
  };

  const startScanner = async () => {
    setScanning(true);
    onError("");
    try {
      const { Html5QrcodeScanner } = await import("html5-qrcode");
      const scanner = new Html5QrcodeScanner(
        containerId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
          videoConstraints: { facingMode: "user" },
          rememberLastUsedCamera: false,
        },
        false
      );
      scannerRef.current = scanner;

      scanner.render(
        (text) => handleScan(text),
        () => {}
      );
    } catch {
      onError("無法啟動相機，請確認瀏覽器已允許相機權限");
      setScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div
        id={containerId}
        className={`overflow-hidden rounded-lg border border-[#2a3548] bg-black ${!scanning ? "hidden" : ""}`}
      />
      {!scanning ? (
        <button
          onClick={startScanner}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f0c040] py-4 text-base font-medium text-[#1a1a1a] hover:bg-[#d4a830]"
        >
          📷 開啟相機掃描 QR Code
        </button>
      ) : (
        <button
          onClick={stopScanner}
          className="w-full rounded-lg border border-[#2a3548] py-2.5 text-sm text-[#8b95a5] hover:bg-[#1a2234]"
        >
          關閉相機
        </button>
      )}
      <p className="text-center text-xs text-[#5a6578]">
        預設使用前置鏡頭 · 第一次掃描 = 進廠 · 同日同案場第二次 = 離廠
      </p>
    </div>
  );
}
