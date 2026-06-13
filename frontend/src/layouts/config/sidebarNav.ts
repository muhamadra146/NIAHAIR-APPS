import type { UserRole } from "@/types/auth";
import {
  LayoutDashboard,
  CalendarDays,
  KanbanSquare,
  Receipt,
  Wallet,
  Users,
  Package,
  UserCog,
  ClipboardList,
  BarChart3,
  Settings,
  Scissors,
  BadgeDollarSign,
  CalendarRange,
  DollarSign,
  Banknote,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label:    string;
  href:     string;
  icon:     LucideIcon;
  roles:    UserRole[];
  children?: Omit<NavItem, "children" | "icon">[];
}

const ALL_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "OWNER",
  "MANAGER",
  "CASHIER",
  "FINANCE",
  "STAFF",
  "STYLIST",
];

const MANAGEMENT_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "OWNER",
  "MANAGER",
];

const POS_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "OWNER",
  "MANAGER",
  "CASHIER",
];

export const sidebarNav: NavItem[] = [
  {
    label: "Dashboard",
    href:  "/dashboard",
    icon:  LayoutDashboard,
    roles: ALL_ROLES,
  },
  {
    label: "Booking",
    href:  "/appointments",
    icon:  CalendarDays,
    roles: [...MANAGEMENT_ROLES, "CASHIER", "STYLIST", "STAFF"],
  },
  {
    label: "Booking Harian",
    href:  "/booking-harian",
    icon:  KanbanSquare,
    roles: [...MANAGEMENT_ROLES, "CASHIER", "STYLIST", "STAFF"],
  },
  {
    label: "POS",
    href:  "/invoices",
    icon:  Receipt,
    roles: POS_ROLES,
    children: [
      { label: "Invoices", href: "/invoices", roles: POS_ROLES },
    ],
  },
  {
    label: "Deposit",
    href:  "/deposits",
    icon:  Wallet,
    roles: POS_ROLES,
    children: [
      { label: "Deposit",            href: "/deposits",         roles: POS_ROLES },
      { label: "Pembayaran Deposit", href: "/deposit-payments", roles: POS_ROLES },
    ],
  },
  {
    label: "Treatments",
    href:  "/treatments",
    icon:  Scissors,
    roles: [...MANAGEMENT_ROLES, "CASHIER", "STYLIST", "STAFF"],
  },
  {
    label: "Commissions",
    href:  "/commissions",
    icon:  BadgeDollarSign,
    roles: [...MANAGEMENT_ROLES, "FINANCE"],
  },
  {
    label: "Customers",
    href:  "/customers",
    icon:  Users,
    roles: [...MANAGEMENT_ROLES, "CASHIER", "STAFF"],
  },
  {
    label: "Inventory",
    href:  "/inventory",
    icon:  Package,
    roles: MANAGEMENT_ROLES,
  },
  {
    label: "Kasbon",
    href:  "/loans",
    icon:  Banknote,
    roles: MANAGEMENT_ROLES,
  },
  {
    label: "Employees",
    href:  "/employees",
    icon:  UserCog,
    roles: MANAGEMENT_ROLES,
  },
  {
    label: "Schedule",
    href:  "/schedule",
    icon:  CalendarRange,
    roles: [...MANAGEMENT_ROLES, "STYLIST", "STAFF"],
  },
  {
    label: "Attendance",
    href:  "/attendance",
    icon:  ClipboardList,
    roles: [...MANAGEMENT_ROLES, "STYLIST", "STAFF"],
  },
  {
    label: "Payroll",
    href:  "/payroll",
    icon:  DollarSign,
    roles: [...MANAGEMENT_ROLES, "FINANCE"],
  },
  {
    label: "Reports",
    href:  "/reports",
    icon:  BarChart3,
    roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "FINANCE"],
  },
  {
    label: "Settings",
    href:  "/settings",
    icon:  Settings,
    roles: ["SUPER_ADMIN", "OWNER"],
  },
];
