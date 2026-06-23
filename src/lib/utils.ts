const MONTH_NAMES = [
  "一月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "十一月", "十二月",
];

const WEEKDAY_LABELS = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

export function formatMonthYear(year: number, month: number) {
  return `${year}年 ${MONTH_NAMES[month]}`;
}

export function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const cells: { date: string; day: number; inMonth: boolean }[] = [];

  const prevMonthLast = new Date(year, month, 0).getDate();
  for (let i = startPad - 1; i >= 0; i--) {
    const d = prevMonthLast - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({
      date: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      inMonth: false,
    });
  }

  for (let d = 1; d <= totalDays; d++) {
    cells.push({
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      inMonth: true,
    });
  }

  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({
      date: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      inMonth: false,
    });
  }

  return { cells, weekdayLabels: WEEKDAY_LABELS };
}

export function calcTax(amount: number): number {
  if (amount <= 20000) return Math.round(amount * 0.1);
  return Math.round(amount * 0.2);
}

export function calculateLeaveDays(
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string
): number {
  if (!startDate || !endDate) return 0;

  const start = new Date(`${startDate}T${startTime || "08:00"}`);
  const end = new Date(`${endDate}T${endTime || "17:00"}`);
  if (end < start) return 0;

  const startDay = new Date(startDate);
  const endDay = new Date(endDate);
  const dayDiff =
    Math.floor((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  let total = 0;
  for (let i = 0; i < dayDiff; i++) {
    const d = new Date(startDay);
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) total += 1;
  }

  if (dayDiff === 1) {
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (diffHours <= 4) return 0.5;
    if (startTime >= "13:00") return 0.5;
    if (endTime <= "12:00") return 0.5;
  }

  return total;
}

export function getDatesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    dates.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`
    );
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}
