export type UserRole = "employee" | "manager" | "admin";

export interface AppSettings {
  registrationEnabled: boolean;
}

export interface User {
  id: string;
  username: string;
  name: string;
  department: string;
  role: UserRole;
  password: string;
}

export type CalendarEventType = "personnel" | "location";

export interface CalendarEvent {
  id: string;
  date: string;
  label: string;
  type: CalendarEventType;
  scheduleGroupId?: string;
  userId?: string;
  startTime?: string;
  endTime?: string;
  entryCategory?: "labor" | "contractor";
  headCount?: number;
  registeredBy?: string;
}

export type LeaveType =
  | "annual"
  | "personal"
  | "sick"
  | "marriage"
  | "bereavement"
  | "maternity"
  | "official"
  | "compensatory";

export type LeaveStatus = "draft" | "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveApplication {
  id: string;
  userId: string;
  userName: string;
  department: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: "特休",
  personal: "事假",
  sick: "病假",
  marriage: "婚假",
  bereavement: "喪假",
  maternity: "產假",
  official: "公假",
  compensatory: "補休",
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  draft: "草稿",
  pending: "待審核",
  approved: "已核准",
  rejected: "已駁回",
  cancelled: "已取消",
};

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface PendingEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  applicant: string;
  personnel: string;
  status: ApprovalStatus;
}

export type RemunerationStatus = "draft" | "pending" | "approved" | "paid";

export interface RemunerationForm {
  id: string;
  userId: string;
  userName: string;
  payeeName: string;
  periodYear: number;
  periodMonth: number;
  workDays: number;
  emergencyHours: number;
  amount: number;
  breakdown: {
    basicFee: number;
    emergencyFee: number;
    mealFee: number;
    nightMealFee: number;
    riskSubsidy: number;
    qualityBonus: number;
  };
  status: RemunerationStatus;
  createdAt: string;
}

export interface RemunerationParams {
  basicDailyFee: number;
  emergencyMultiplier: number;
  mealFullDayFee: number;
  nightMealFee: number;
  riskSubsidyFullDay: number;
  qualityBonus: number;
}

export type AttendanceStatus = "normal" | "late" | "early_leave" | "absent" | "overtime";

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hours: number;
  site: string;
  status: AttendanceStatus;
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  normal: "正常",
  late: "遲到",
  early_leave: "早退",
  absent: "缺勤",
  overtime: "加班",
};

export const REMUNERATION_STATUS_LABELS: Record<RemunerationStatus, string> = {
  draft: "草稿",
  pending: "待審核",
  approved: "已核准",
  paid: "已付款",
};

export type ExpenseEntryType = "expense" | "purchase";

export type ExpenseStatus = "confirmed" | "pending" | "approved" | "rejected";

export interface ExpenseEntry {
  id: string;
  site: string;
  item: string;
  amount: number;
  note: string;
  type: ExpenseEntryType;
  status: ExpenseStatus;
  userId: string;
  userName: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export const EXPENSE_TYPE_LABELS: Record<ExpenseEntryType, string> = {
  expense: "支出登記",
  purchase: "購買申請",
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  confirmed: "已登記",
  pending: "待審核",
  approved: "已核准購買",
  rejected: "已駁回",
};
