import { User } from "./types";

export const DEMO_USERS: User[] = [
  {
    id: "u1",
    username: "admin",
    name: "系統管理員",
    department: "管理部",
    role: "admin",
    password: "admin123",
  },
  {
    id: "u2",
    username: "manager",
    name: "王主管",
    department: "業務部",
    role: "manager",
    password: "manager123",
  },
  {
    id: "u4",
    username: "su_yuyong",
    name: "蘇毓詠",
    department: "工程部",
    role: "employee",
    password: "123456",
  },
  {
    id: "u5",
    username: "chen_hongbin",
    name: "陳宏彬",
    department: "工程部",
    role: "employee",
    password: "123456",
  },
  {
    id: "u6",
    username: "xie_hongzhong",
    name: "謝宏忠",
    department: "工程部",
    role: "employee",
    password: "123456",
  },
  {
    id: "u7",
    username: "zhang_jiahui",
    name: "張家輝",
    department: "工程部",
    role: "employee",
    password: "123456",
  },
  {
    id: "u8",
    username: "luo_zhijie",
    name: "羅智傑",
    department: "工程部",
    role: "employee",
    password: "123456",
  },
  {
    id: "u3",
    username: "employee",
    name: "李員工",
    department: "業務部",
    role: "employee",
    password: "employee123",
  },
];

export function getEmployeeUsers(users: User[]) {
  return users.filter((u) => u.role === "employee");
}
