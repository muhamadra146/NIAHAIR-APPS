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
import { DepositPaymentListPage }  from "@/features/invoice/pages/DepositPaymentListPage";
import { InvoicePaymentListPage }  from "@/features/invoice/pages/InvoicePaymentListPage";
import { CommissionListPage }    from "@/features/commission/pages/CommissionListPage";
import { InventoryPage }         from "@/features/inventory/pages/InventoryPage";
import { ReportsPage }           from "@/features/report/pages/ReportsPage";
import { LoanListPage }               from "@/features/loan/pages/LoanListPage";
import { LoanDetailPage }             from "@/features/loan/pages/LoanDetailPage";
import { ConsultationListPage }       from "@/features/consultation/pages/ConsultationListPage";
import { ConsultationFormPage }       from "@/features/consultation/pages/ConsultationFormPage";
import { LeavePage }                  from "@/features/leave/pages/LeavePage";
import { MyPayslipPage }             from "@/features/payroll/pages/MyPayslipPage";
import { CorrectionPage }            from "@/features/attendance/pages/CorrectionPage";
import { PermissionPage }            from "@/features/attendance/pages/PermissionPage";
import { SickLeavePage }             from "@/features/attendance/pages/SickLeavePage";
import { AssignmentHarianPage }      from "@/features/invoice/pages/AssignmentHarianPage";

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
          { path: "/deposits",              element: <DepositListPage /> },
          { path: "/deposits/:id",          element: <DepositDetailPage /> },
          { path: "/deposits/:id/pay",      element: <DepositPaymentPage /> },
          { path: "/deposit-payments",      element: <DepositPaymentListPage /> },
          { path: "/invoice-payments",      element: <InvoicePaymentListPage /> },
          // Commissions
          { path: "/commissions",       element: <CommissionListPage /> },
          { path: "/assignment-harian", element: <AssignmentHarianPage /> },
          // Inventory
          { path: "/inventory", element: <InventoryPage /> },
          // Reports
          { path: "/reports", element: <ReportsPage /> },
          // Loans (Kasbon)
          { path: "/loans",     element: <LoanListPage /> },
          { path: "/loans/:id", element: <LoanDetailPage /> },
          // Consultation Notes
          { path: "/consultation-notes",          element: <ConsultationListPage /> },
          { path: "/consultation-notes/new",      element: <ConsultationFormPage /> },
          { path: "/consultation-notes/:id/edit", element: <ConsultationFormPage /> },
          // Leave Management
          { path: "/leaves", element: <LeavePage /> },
          // My Payslip (employee self-service)
          { path: "/my-payslip", element: <MyPayslipPage /> },
          // Attendance Correction
          { path: "/attendance-corrections", element: <CorrectionPage /> },
          // Permission (Izin)
          { path: "/permissions", element: <PermissionPage /> },
          // Sick Leave (Sakit)
          { path: "/sick-leaves", element: <SickLeavePage /> },
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
