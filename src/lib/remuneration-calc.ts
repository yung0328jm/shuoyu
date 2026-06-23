export interface RemunerationParams {
  basicDailyFee: number;
  emergencyMultiplier: number;
  mealFullDayFee: number;
  nightMealFee: number;
  riskSubsidyFullDay: number;
  qualityBonus: number;
}

export interface WorkStats {
  /** 有出工紀錄的天數（含滿日與未滿日） */
  workDays: number;
  /** 淨工時 ≥ 8 小時的天數 */
  fullDays: number;
  /** 未滿 8 小時的天數 */
  partialDayCount: number;
  /** 未滿 8 小時日的淨工時合計 */
  partialHours: number;
  /** 以 8 小時為 1 日的等效天數（滿日 + 未滿時數÷8） */
  dayUnits: number;
  emergencyHours: number;
  /** 未滿 8 小時日所缺時數合計（8 − 當日工時） */
  incompleteHours: number;
  nightMealDays: number;
}

/** 換算成以 8 小時為 1 日的等效天數 */
export function getDayUnits(stats: WorkStats): number {
  return stats.dayUnits;
}

export interface RemunerationBreakdown {
  basicFee: number;
  emergencyFee: number;
  mealFee: number;
  nightMealFee: number;
  riskSubsidy: number;
  qualityBonus: number;
  total: number;
  hourlyRate: number;
}

export const DEFAULT_REMUNERATION_PARAMS: RemunerationParams = {
  basicDailyFee: 2100,
  emergencyMultiplier: 1.35,
  mealFullDayFee: 130,
  nightMealFee: 100,
  riskSubsidyFullDay: 60,
  qualityBonus: 0,
};

export function calculateRemuneration(
  params: RemunerationParams,
  stats: WorkStats
): RemunerationBreakdown {
  const hourlyRate = params.basicDailyFee / 8;
  const dayUnits = getDayUnits(stats);
  const basicFee = dayUnits * params.basicDailyFee;
  const emergencyFee =
    stats.emergencyHours * hourlyRate * params.emergencyMultiplier;
  const mealFee = dayUnits * params.mealFullDayFee;
  const nightMealFee = stats.nightMealDays * params.nightMealFee;
  const riskSubsidy = dayUnits * params.riskSubsidyFullDay;
  const qualityBonus = params.qualityBonus;
  const total =
    basicFee +
    emergencyFee +
    mealFee +
    nightMealFee +
    riskSubsidy +
    qualityBonus;

  return {
    basicFee,
    emergencyFee,
    mealFee,
    nightMealFee,
    riskSubsidy,
    qualityBonus,
    total,
    hourlyRate,
  };
}

export function formatMoney(n: number) {
  return n.toLocaleString("zh-TW", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
