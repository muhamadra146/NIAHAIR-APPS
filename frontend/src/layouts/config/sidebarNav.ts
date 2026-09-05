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
  BadgeDollarSign,
  CalendarRange,
  DollarSign,
  Banknote,
  NotebookPen,
  UmbrellaOff,
  FileText,
  HandHelping,
  Thermometer,
  Sparkles,
  ShoppingCart,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label:          string;
  href:           string;
  icon:           LucideIcon;
  roles:          UserRole[];       // siapa yang BISA LIHAT menu ini
  viewOnlyRoles?: UserRole[];       // subset dari roles yang hanya read-only (hide write buttons di page)
  group?:         string;
  children?: Omit<NavItem, "children" | "icon" | "group">[];
}

// ── Role Groups ──────────────────────────────────────────────────────────────
const ADMIN_ROLES: UserRole[] = [
  "SUPER_ADMIN", "OWNER",
];

const MANAGEMENT_ROLES: UserRole[] = [
  "SUPER_ADMIN", "OWNER", "MANAGER",
];

const POS_ROLES: UserRole[] = [
  "SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER",
];

const ALL_ROLES: UserRole[] = [
  "SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER",
  "STAFF_OPERASIONAL", "INVENTORY", "OFFICE", "FINANCE",
];

// ── Sidebar Nav ──────────────────────────────────────────────────────────────
export const sidebarNav: NavItem[] = [

  // ── Overview ──────────────────────────────────────────────────────────────
  {
    label: "Dashboard",
    href:  "/dashboard",
    icon:  LayoutDashboard,
    roles: ALL_ROLES,
    group: "Overview",
  },

  // ── Operasional ───────────────────────────────────────────────────────────
  {
    label:          "Deposit",
    href:           "/deposits",
    icon:           Wallet,
    roles:          [...POS_ROLES, "OFFICE", "FINANCE"],
    viewOnlyRoles:  ["OFFICE", "FINANCE"],
    group:          "Operasional",
    children: [
      {
        label:         "Deposit",
        href:          "/deposits",
        roles:         [...POS_ROLES, "OFFICE", "FINANCE"],
        viewOnlyRoles: ["OFFICE", "FINANCE"],
      },
      {
        label:         "Pembayaran Deposit",
        href:          "/deposit-payments",
        roles:         [...POS_ROLES, "OFFICE", "FINANCE"],
        viewOnlyRoles: ["OFFICE", "FINANCE"],
      },
    ],
  },

  {
    label:         "Booking",
    href:          "/appointments",
    icon:          CalendarDays,
    roles:         [...POS_ROLES, "OFFICE", "FINANCE"],
    viewOnlyRoles: ["OFFICE", "FINANCE"],
    group:         "Operasional",
  },

  {
    label:         "Booking Harian",
    href:          "/booking-harian",
    icon:          KanbanSquare,
    roles:         [...POS_ROLES, "STAFF_OPERASIONAL", "OFFICE", "FINANCE"],
    viewOnlyRoles: ["STAFF_OPERASIONAL", "OFFICE", "FINANCE"],
    group:         "Operasional",
  },

  {
    label: "POS",
    href:  "/invoices",
    icon:  Receipt,
    roles: POS_ROLES,
    group: "Operasional",
    children: [
      { label: "Invoices",           href: "/invoices",          roles: POS_ROLES },
      { label: "Pembayaran Invoice", href: "/invoice-payments",  roles: POS_ROLES },
    ],
  },

  {
    label:         "Catatan Klien",
    href:          "/consultation-notes",
    icon:          NotebookPen,
    roles:         [...POS_ROLES, "STAFF_OPERASIONAL", "OFFICE", "FINANCE"],
    viewOnlyRoles: ["OFFICE", "FINANCE"],
    group:         "Operasional",
  },

  {
    label:         "Komplain Client",
    href:          "/complaints",
    icon:          AlertCircle,
    roles:         [...POS_ROLES, "OFFICE", "FINANCE"],
    viewOnlyRoles: ["OFFICE", "FINANCE"],
    group:         "Operasional",
  },

  // ── Keuangan ──────────────────────────────────────────────────────────────
  {
    label:         "Commissions",
    href:          "/commissions",
    icon:          BadgeDollarSign,
    roles:         [...ADMIN_ROLES, "MANAGER", "FINANCE"],
    viewOnlyRoles: ["MANAGER"],
    group:         "Keuangan",
  },

  {
    label: "Generate Komisi",
    href:  "/generate-komisi",
    icon:  Sparkles,
    roles: [...ADMIN_ROLES, "FINANCE"],
    group: "Keuangan",
  },

  {
    label:         "Kasbon",
    href:          "/loans",
    icon:          Banknote,
    roles:         [...ADMIN_ROLES, "MANAGER", "FINANCE"],
    viewOnlyRoles: ["MANAGER"],
    group:         "Keuangan",
  },

  {
    label: "Payroll",
    href:  "/payroll",
    icon:  DollarSign,
    roles: [...ADMIN_ROLES, "FINANCE"],
    group: "Keuangan",
  },

  {
    label: "Laporan BPJS",
    href:  "/payroll/bpjs",
    icon:  FileText,
    roles: [...ADMIN_ROLES, "FINANCE"],
    group: "Keuangan",
  },

  // ── Data ──────────────────────────────────────────────────────────────────
  {
    label:         "Customers",
    href:          "/customers",
    icon:          Users,
    roles:         [...POS_ROLES, "OFFICE", "FINANCE"],
    viewOnlyRoles: ["FINANCE"],
    group:         "Data",
  },

  {
    label:         "Employees",
    href:          "/employees",
    icon:          UserCog,
    roles:         [...MANAGEMENT_ROLES, "OFFICE", "FINANCE"],
    viewOnlyRoles: ["FINANCE"],
    group:         "Data",
  },

  {
    label:         "Inventory",
    href:          "/inventory",
    icon:          Package,
    roles:         [...MANAGEMENT_ROLES, "INVENTORY", "OFFICE", "FINANCE"],
    viewOnlyRoles: ["OFFICE"],
    group:         "Data",
  },

  {
    label:         "Pembelian",
    href:          "/purchases",
    icon:          ShoppingCart,
    roles:         [...MANAGEMENT_ROLES, "INVENTORY", "FINANCE", "OFFICE"],
    viewOnlyRoles: ["OFFICE"],
    group:         "Data",
  },

  // ── Kehadiran ─────────────────────────────────────────────────────────────
  {
    label:         "Schedule",
    href:          "/schedule",
    icon:          CalendarRange,
    roles:         [...MANAGEMENT_ROLES, "OFFICE", "FINANCE"],
    viewOnlyRoles: ["FINANCE"],
    group:         "Kehadiran",
  },

  {
    label:         "Attendance",
    href:          "/attendance",
    icon:          ClipboardList,
    roles:         [...MANAGEMENT_ROLES, "OFFICE", "FINANCE"],
    viewOnlyRoles: ["FINANCE"],
    group:         "Kehadiran",
  },

  {
    label: "Cuti",
    href:  "/leaves",
    icon:  UmbrellaOff,
    roles: ALL_ROLES,
    group: "Kehadiran",
  },

  {
    label: "Izin",
    href:  "/permissions",
    icon:  HandHelping,
    roles: ALL_ROLES,
    group: "Kehadiran",
  },

  {
    label: "Sakit",
    href:  "/sick-leaves",
    icon:  Thermometer,
    roles: ALL_ROLES,
    group: "Kehadiran",
  },

  // ── Keuangan Saya ─────────────────────────────────────────────────────────
  {
    label: "Slip Gaji",
    href:  "/my-payslip",
    icon:  FileText,
    roles: ALL_ROLES,
    group: "Keuangan Saya",
  },

  {
    label: "Komisi Saya",
    href:  "/my-commission",
    icon:  BadgeDollarSign,
    roles: ["STAFF_OPERASIONAL", "CASHIER"],
    group: "Keuangan Saya",
  },

  {
    label: "Kasbon Saya",
    href:  "/my-kasbon",
    icon:  Banknote,
    roles: ALL_ROLES,
    group: "Keuangan Saya",
  },

  // ── Lainnya ───────────────────────────────────────────────────────────────
  {
    label: "Reports",
    href:  "/reports",
    icon:  BarChart3,
    roles: [...ADMIN_ROLES, "MANAGER", "INVENTORY", "OFFICE", "FINANCE"],
    group: "Lainnya",
  },

  {
    label: "Settings",
    href:  "/settings",
    icon:  Settings,
    roles: ADMIN_ROLES,
    group: "Lainnya",
  },
];
