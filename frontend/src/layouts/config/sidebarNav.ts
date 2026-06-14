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
  group?:   string;
  children?: Omit<NavItem, "children" | "icon" | "group">[];
}

const ALL_ROLES: UserRole[] = [
  "SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER", "FINANCE", "STAFF", "STYLIST",
];

const MANAGEMENT_ROLES: UserRole[] = [
  "SUPER_ADMIN", "OWNER", "MANAGER",
];

const POS_ROLES: UserRole[] = [
  "SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER",
];

export const sidebarNav: NavItem[] = [
  // ── Overview ──────────────────────────────────────────────────────────
  {
    label: "Dashboard",
    href:  "/dashboard",
    icon:  LayoutDashboard,
    roles: ALL_ROLES,
    group: "Overview",
  },

  // ── Operasional ───────────────────────────────────────────────────────
  {
    label: "Deposit",
    href:  "/deposits",
    icon:  Wallet,
    roles: POS_ROLES,
    group: "Operasional",
    children: [
      { label: "Deposit",            href: "/deposits",         roles: POS_ROLES },
      { label: "Pembayaran Deposit", href: "/deposit-payments", roles: POS_ROLES },
    ],
  },
  {
    label: "Booking",
    href:  "/appointments",
    icon:  CalendarDays,
    roles: [...MANAGEMENT_ROLES, "CASHIER", "STYLIST", "STAFF"],
    group: "Operasional",
  },
  {
    label: "Booking Harian",
    href:  "/booking-harian",
    icon:  KanbanSquare,
    roles: [...MANAGEMENT_ROLES, "CASHIER", "STYLIST", "STAFF"],
    group: "Operasional",
  },
  {
    label: "POS",
    href:  "/invoices",
    icon:  Receipt,
    roles: POS_ROLES,
    group: "Operasional",
    children: [
      { label: "Invoices", href: "/invoices", roles: POS_ROLES },
    ],
  },
  {
    label: "Treatments",
    href:  "/treatments",
    icon:  Scissors,
    roles: [...MANAGEMENT_ROLES, "CASHIER", "STYLIST", "STAFF"],
    group: "Operasional",
  },

  // ── Keuangan ──────────────────────────────────────────────────────────
  {
    label: "Commissions",
    href:  "/commissions",
    icon:  BadgeDollarSign,
    roles: [...MANAGEMENT_ROLES, "FINANCE"],
    group: "Keuangan",
  },
  {
    label: "Kasbon",
    href:  "/loans",
    icon:  Banknote,
    roles: MANAGEMENT_ROLES,
    group: "Keuangan",
  },
  {
    label: "Payroll",
    href:  "/payroll",
    icon:  DollarSign,
    roles: [...MANAGEMENT_ROLES, "FINANCE"],
    group: "Keuangan",
  },

  // ── Data ──────────────────────────────────────────────────────────────
  {
    label: "Customers",
    href:  "/customers",
    icon:  Users,
    roles: [...MANAGEMENT_ROLES, "CASHIER", "STAFF"],
    group: "Data",
  },
  {
    label: "Employees",
    href:  "/employees",
    icon:  UserCog,
    roles: MANAGEMENT_ROLES,
    group: "Data",
  },
  {
    label: "Inventory",
    href:  "/inventory",
    icon:  Package,
    roles: MANAGEMENT_ROLES,
    group: "Data",
  },

  // ── Kehadiran ─────────────────────────────────────────────────────────
  {
    label: "Schedule",
    href:  "/schedule",
    icon:  CalendarRange,
    roles: [...MANAGEMENT_ROLES, "STYLIST", "STAFF"],
    group: "Kehadiran",
  },
  {
    label: "Attendance",
    href:  "/attendance",
    icon:  ClipboardList,
    roles: [...MANAGEMENT_ROLES, "STYLIST", "STAFF"],
    group: "Kehadiran",
  },

  // ── Lainnya ───────────────────────────────────────────────────────────
  {
    label: "Reports",
    href:  "/reports",
    icon:  BarChart3,
    roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "FINANCE"],
    group: "Lainnya",
  },
  {
    label: "Settings",
    href:  "/settings",
    icon:  Settings,
    roles: ["SUPER_ADMIN", "OWNER"],
    group: "Lainnya",
  },
];
