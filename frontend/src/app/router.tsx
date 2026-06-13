import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthLayout } from "@/layouts/AuthLayout";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { BranchSelectorPage } from "@/features/auth/pages/BranchSelectorPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { CustomerListPage } from "@/features/customer/pages/CustomerListPage";
import { CustomerDetailPage } from "@/features/customer/pages/CustomerDetailPage";
import { AppointmentListPage } from "@/features/appointment/pages/AppointmentListPage";
import { AppointmentDetailPage } from "@/features/appointment/pages/AppointmentDetailPage";
import { DailyBoardPage } from "@/features/appointment/pages/DailyBoardPage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";
import { TeamPage }     from "@/features/team/pages/TeamPage";
import { SchedulePage } from "@/features/schedule/pages/SchedulePage";
import { PayrollPage }       from "@/features/payroll/pages/PayrollPage";
import { EmployeeListPage }       from "@/features/employee/pages/EmployeeListPage";
import { EmployeeDetailPage }     from "@/features/employee/pages/EmployeeDetailPage";
import { TreatmentListPage }      from "@/features/treatment/pages/TreatmentListPage";
import { TreatmentDetailPage }    from "@/features/treatment/pages/TreatmentDetailPage";
import { InvoiceListPage }        from "@/features/invoice/pages/InvoiceListPage";
import { InvoiceDetailPage }      from "@/features/invoice/pages/InvoiceDetailPage";
import { DepositListPage }        from "@/features/invoice/pages/DepositListPage";
import { DepositDetailPage }      from "@/features/invoice/pages/DepositDetailPage";
import { DepositPaymentPage }     from "@/features/invoice/pages/DepositPaymentPage";
import { CommissionListPage }    from "@/features/commission/pages/CommissionListPage";
import { InventoryPage }         from "@/features/inventory/pages/InventoryPage";
import { ReportsPage }           from "@/features/report/pages/ReportsPage";
import { LoanListPage }          from "@/features/loan/pages/LoanListPage";
import { LoanDetailPage }        from "@/features/loan/pages/LoanDetailPage";

export const router = createBrowserRouter([
  // ── Public routes ────────────────────────────────────────────────────
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
    ],
  },

  // ── Protected routes ─────────────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      // Branch selector — accessible before branchId is set
      { path: "/branch-select", element: <BranchSelectorPage /> },

      {
        element: <DashboardLayout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          // Customers
          { path: "/customers",     element: <CustomerListPage /> },
          { path: "/customers/:id", element: <CustomerDetailPage /> },
          // Appointments
          { path: "/appointments",       element: <AppointmentListPage /> },
          { path: "/appointments/:id",   element: <AppointmentDetailPage /> },
          { path: "/booking-harian",     element: <DailyBoardPage /> },
          // Schedule (Roster)
          { path: "/schedule", element: <SchedulePage /> },
          // Team / Attendance
          { path: "/attendance", element: <TeamPage /> },
          // Payroll
          { path: "/payroll", element: <PayrollPage /> },
          // Employees
          { path: "/employees",     element: <EmployeeListPage /> },
          { path: "/employees/:id", element: <EmployeeDetailPage /> },
          // Treatments
          { path: "/treatments",     element: <TreatmentListPage /> },
          { path: "/treatments/:id", element: <TreatmentDetailPage /> },
          // Invoices / POS
          { path: "/invoices",     element: <InvoiceListPage /> },
          { path: "/invoices/:id", element: <InvoiceDetailPage /> },
          // Deposits
          { path: "/deposits",         element: <DepositListPage /> },
          { path: "/deposits/:id",     element: <DepositDetailPage /> },
          { path: "/deposits/:id/pay", element: <DepositPaymentPage /> },
          // Commissions
          { path: "/commissions", element: <CommissionListPage /> },
          // Inventory
          { path: "/inventory", element: <InventoryPage /> },
          // Reports
          { path: "/reports", element: <ReportsPage /> },
          // Loans (Kasbon)
          { path: "/loans",     element: <LoanListPage /> },
          { path: "/loans/:id", element: <LoanDetailPage /> },
          // Settings
          { path: "/settings", element: <SettingsPage /> },
        ],
      },
    ],
  },

  // ── Fallback ─────────────────────────────────────────────────────────
  { path: "/",  element: <Navigate to="/dashboard" replace /> },
  { path: "*",  element: <Navigate to="/dashboard" replace /> },
]);
