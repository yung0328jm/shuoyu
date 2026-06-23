"use client";

import { useState, useEffect } from "react";
import { User, RemunerationParams } from "@/lib/types";
import {
  calculateRemuneration,
  formatMoney,
} from "@/lib/remuneration-calc";
import {
  getWorkStats,
  getWorkDetails,
  WorkDetail,
} from "@/lib/remuneration-stats";
import { getEmployeeParams, saveEmployeeParams } from "@/lib/employee-params";

const inputClass =
  "w-full rounded border border-[#2a3548] bg-[#0d1117] px-3 py-2 text-sm text-white focus:border-[#34d399] focus:outline-none";

interface EmployeeRemunerationCardProps {
  employee: User;
  year: number;
  month: number;
  canEditParams: boolean;
  onParamsSaved?: () => void;
}

export function EmployeeRemunerationCard({
  employee,
  year,
  month,
  canEditParams,
  onParamsSaved,
}: EmployeeRemunerationCardProps) {
  const stats = getWorkStats(employee.name, year, month);
  const workDetails = getWorkDetails(employee.name, year, month);
  const savedParams = getEmployeeParams(employee.id);

  const [params, setParams] = useState<RemunerationParams>(savedParams);
  const [draftParams, setDraftParams] = useState<RemunerationParams>(savedParams);
  const [editingParams, setEditingParams] = useState(false);
  const [showWorkDetails, setShowWorkDetails] = useState(false);
  const [showBonusEdit, setShowBonusEdit] = useState(false);
  const [bonusInput, setBonusInput] = useState("0");

  useEffect(() => {
    const p = getEmployeeParams(employee.id);
    setParams(p);
    setDraftParams(p);
  }, [employee.id]);

  const breakdown = calculateRemuneration(params, stats);
  const isDirty = JSON.stringify(draftParams) !== JSON.stringify(params);

  const updateDraft = (key: keyof RemunerationParams, value: number) => {
    setDraftParams((p) => ({ ...p, [key]: value }));
  };

  const handleSaveParams = () => {
    saveEmployeeParams(employee.id, draftParams);
    setParams(draftParams);
    setEditingParams(false);
    onParamsSaved?.();
  };

  const handleCancelParams = () => {
    setDraftParams(params);
    setEditingParams(false);
  };

  const handleSaveBonus = () => {
    const val = Number(bonusInput) || 0;
    const updated = { ...params, qualityBonus: val };
    saveEmployeeParams(employee.id, updated);
    setParams(updated);
    setDraftParams(updated);
    setShowBonusEdit(false);
    onParamsSaved?.();
  };

  const basicDetail = dayBasedFeeDetail(
    stats.fullDays,
    stats.partialHours,
    params.basicDailyFee,
    false
  );
  const mealDetail = dayBasedFeeDetail(
    stats.fullDays,
    stats.partialHours,
    params.mealFullDayFee,
    true
  );
  const riskDetail = dayBasedFeeDetail(
    stats.fullDays,
    stats.partialHours,
    params.riskSubsidyFullDay,
    true
  );

  const lineItems = [
    {
      label: "案場出勤基本工程款",
      detail: basicDetail,
      amount: breakdown.basicFee,
    },
    {
      label: "緊急追加服務費",
      detail: `${stats.emergencyHours} 小時 × $${formatMoney(breakdown.hourlyRate)} × ${params.emergencyMultiplier}`,
      amount: breakdown.emergencyFee,
    },
    {
      label: "案場誤餐雜支費",
      detail: mealDetail,
      amount: breakdown.mealFee,
    },
    {
      label: "夜間誤餐雜支費",
      detail: `${stats.nightMealDays} 日 × $${params.nightMealFee}`,
      amount: breakdown.nightMealFee,
    },
    {
      label: "外包風險管理補貼",
      detail: riskDetail,
      amount: breakdown.riskSubsidy,
    },
    {
      label: "案場完工品質獎勵金",
      detail: "",
      amount: breakdown.qualityBonus,
    },
  ];

  return (
    <div className="rounded border border-[#2a3548] bg-[#111827] overflow-hidden">
      <div className="grid lg:grid-cols-3">
        {/* 左側：自動計算結果 */}
        <div className="border-b border-[#2a3548] p-5 lg:col-span-2 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">{employee.name}</h3>
              <p className="text-xs text-[#5a6578]">資料來源：行事曆排程人員自動帶入</p>
            </div>
            <p className="text-2xl font-bold text-[#34d399]">
              ${formatMoney(breakdown.total)}
            </p>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <StatBox label="出工天" value={`${stats.workDays} 天`} accent />
            <StatBox label="緊急入場時數" value={`${stats.emergencyHours} 小時`} />
            <StatBox label="未滿時數" value={`${stats.incompleteHours} 小時`} />
          </div>

          <div className="overflow-hidden rounded border border-[#2a3548]">
            <table className="w-full text-xs sm:text-sm">
              <tbody className="divide-y divide-[#2a3548]">
                {lineItems.map((item) => (
                  <tr key={item.label}>
                    <td className="px-3 py-2 text-[#c8cdd5]">
                      {item.label}
                      {item.detail && (
                        <span className="ml-1 text-[10px] text-[#5a6578] sm:text-xs">
                          {item.detail}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-white whitespace-nowrap">
                      ${formatMoney(item.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#0d1117]">
                  <td className="px-3 py-2 font-bold text-[#34d399]">合計</td>
                  <td className="px-3 py-2 text-right font-bold text-[#34d399]">
                    ${formatMoney(breakdown.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {workDetails.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowWorkDetails(!showWorkDetails)}
                className="flex w-full items-center justify-between rounded border border-[#2a3548] bg-[#0d1117] px-3 py-2 text-xs text-[#c8cdd5] hover:bg-[#1a2234]"
              >
                <span>查看 {workDetails.length} 筆出工明細</span>
                <span>{showWorkDetails ? "▲" : "▼"}</span>
              </button>
              {showWorkDetails && (
                <WorkDetailsTable details={workDetails} />
              )}
            </div>
          )}
        </div>

        {/* 右側：個人費用參數 */}
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-medium text-[#f0c040]">費用參數</h4>
            {canEditParams && !editingParams && (
              <button
                onClick={() => {
                  setDraftParams(params);
                  setEditingParams(true);
                }}
                className="rounded border border-[#2a3548] px-2 py-0.5 text-xs text-[#8b95a5] hover:text-white"
              >
                編輯
              </button>
            )}
          </div>

          {!editingParams ? (
            <div className="space-y-1.5 text-xs">
              <ParamRow label="出勤基本工程款" value={`$${params.basicDailyFee.toLocaleString()} / 天`} />
              <ParamRow label="追加服務倍率" value={`× ${params.emergencyMultiplier}`} />
              <ParamRow label="誤餐雜支" value={`$${params.mealFullDayFee} / 天`} />
              <ParamRow label="夜間誤餐雜支" value={`$${params.nightMealFee} / 日`} hint="≥3h" />
              <ParamRow label="風險管理" value={`$${params.riskSubsidyFullDay} / 天`} />
            </div>
          ) : (
            <div className="space-y-3">
              <ParamInput label="出勤基本工程款（日）" unit="元" value={draftParams.basicDailyFee} onChange={(v) => updateDraft("basicDailyFee", v)} />
              <ParamInput label="追加服務倍率" value={draftParams.emergencyMultiplier} step={0.01} onChange={(v) => updateDraft("emergencyMultiplier", v)} />
              <ParamInput label="誤餐雜支（滿日）" unit="元/天" value={draftParams.mealFullDayFee} onChange={(v) => updateDraft("mealFullDayFee", v)} />
              <ParamInput label="夜間誤餐雜支" unit="元/日" value={draftParams.nightMealFee} onChange={(v) => updateDraft("nightMealFee", v)} />
              <ParamInput label="風險管理（滿日）" unit="元/天" value={draftParams.riskSubsidyFullDay} onChange={(v) => updateDraft("riskSubsidyFullDay", v)} />
              <div className="flex gap-2 pt-1">
                <button onClick={handleSaveParams} disabled={!isDirty} className="flex-1 rounded bg-[#34d399] py-1.5 text-xs font-medium text-[#0a0e17] disabled:opacity-40">儲存</button>
                <button onClick={handleCancelParams} className="flex-1 rounded border border-[#2a3548] py-1.5 text-xs text-[#8b95a5]">取消</button>
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-[#2a3548] pt-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[#8b95a5]">案場完工品質獎勵金</p>
                <p className="text-sm font-medium text-white">
                  ${formatMoney(params.qualityBonus)}
                </p>
              </div>
              {canEditParams && (
                <button
                  onClick={() => {
                    setBonusInput(String(params.qualityBonus));
                    setShowBonusEdit(true);
                  }}
                  className="rounded border border-[#34d399]/50 px-2 py-0.5 text-[10px] text-[#34d399]"
                >
                  + 設定
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showBonusEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-[#2a3548] bg-[#111827] p-6">
            <h4 className="mb-4 text-base font-medium text-[#f0c040]">
              {employee.name} — 品質獎勵金
            </h4>
            <input type="number" className={inputClass} value={bonusInput} onChange={(e) => setBonusInput(e.target.value)} />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowBonusEdit(false)} className="flex-1 rounded border border-[#2a3548] py-2 text-sm text-[#8b95a5]">取消</button>
              <button onClick={handleSaveBonus} className="flex-1 rounded bg-[#34d399] py-2 text-sm font-medium text-[#0a0e17]">確定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function dayBasedFeeDetail(
  fullDays: number,
  partialHours: number,
  unitFee: number,
  useFullDayLabel: boolean
): string {
  const parts: string[] = [];
  const fee = unitFee.toLocaleString();

  if (fullDays > 0) {
    parts.push(
      useFullDayLabel
        ? `滿日 ${fullDays} 天 × $${fee}`
        : `${fullDays} 天 × $${fee}`
    );
  }
  if (partialHours > 0) {
    parts.push(`未滿 ${partialHours} 小時 ÷ 8 × $${fee}`);
  }
  return parts.join(" + ") || `0 天 × $${fee}`;
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded border border-[#2a3548] bg-[#0d1117] px-2 py-2 text-center">
      <p className="text-[10px] text-[#8b95a5]">{label}</p>
      <p className={`text-sm font-bold ${accent ? "text-[#f0c040]" : "text-white"}`}>{value}</p>
    </div>
  );
}

function ParamRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex justify-between rounded bg-[#0d1117] px-2 py-1.5">
      <span className="text-[#8b95a5]">{label}</span>
      <span className="text-white">
        {value}
        {hint && <span className="ml-1 text-[#5a6578]">({hint})</span>}
      </span>
    </div>
  );
}

function ParamInput({ label, unit, value, step = 1, onChange }: { label: string; unit?: string; value: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="mb-0.5 block text-[10px] text-[#8b95a5]">{label}</label>
      <div className="flex items-center gap-1">
        <input type="number" step={step} className={inputClass} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
        {unit && <span className="shrink-0 text-[10px] text-[#5a6578]">{unit}</span>}
      </div>
    </div>
  );
}

function WorkDetailsTable({ details }: { details: WorkDetail[] }) {
  return (
    <div className="mt-2 overflow-hidden rounded border border-[#2a3548]">
      <table className="w-full text-xs">
        <thead className="bg-[#0a0e17] text-[#8b95a5]">
          <tr>
            <th className="px-2 py-1.5 text-left">日期</th>
            <th className="px-2 py-1.5 text-left">案場</th>
            <th className="px-2 py-1.5 text-right">緊急時數</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1a2234] bg-[#0d1117]">
          {details.map((d) => (
            <tr key={d.date}>
              <td className="px-2 py-1.5 text-[#c8cdd5]">{d.date}</td>
              <td className="px-2 py-1.5 text-[#8b95a5]">{d.site}</td>
              <td className="px-2 py-1.5 text-right text-[#f0c040]">
                {d.emergencyHours > 0 ? `${d.emergencyHours}h` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
