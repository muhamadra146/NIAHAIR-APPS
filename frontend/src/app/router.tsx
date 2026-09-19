import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthLayout } from "@/layouts/AuthLayout";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoginPage }           from "@/features/auth/pages/LoginPage";
import { ForgotPasswordPage }  from "@/features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage }   from "@/features/auth/pages/ResetPasswordPage";
import { BranchSelectorPage }  from "@/features/auth/pages/BranchSelectorPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { CustomerListPage } from "@/features/customer/pages/CustomerListPage";
import { CustomerDetailPage } from "@/features/customer/pages/CustomerDetailPage";
import { AppointmentListPage } from "@/features/appointment/pages/AppointmentListPage";
import { AppointmentDetailPage } from "@/features/appointment/pages/AppointmentDetailPage";
import { DailyBoardPage } from "@/features/appointment/pages/DailyBoardPage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";
import { TeamPage }     from "@/features/team/pages/TeamPage";
import { SchedulePage }   from "@/features/schedule/pages/SchedulePage";
import { MySchedulePage } from "@/features/schedule/pages/MySchedulePage";
import { PayrollPage }       from "@/features/payroll/pages/PayrollPage";
import { EmployeeListPage }       from "@/features/employee/pages/EmployeeListPage";
import { EmployeeDetailPage }     from "@/features/employee/pages/EmployeeDetailPage";
import { InvoiceListPage }        from "@/features/invoice/pages/InvoiceListPage";
import { InvoiceDetailPage }      from "@/features/invoice/pages/InvoiceDetailPage";
import { DepositListPage }        from "@/features/invoice/pages/DepositListPage";
import { DepositDetailPage }      from "@/features/invoice/pages/DepositDetailPage";
import { DepositPaymentPage }     from "@/features/invoice/pages/DepositPaymentPage";
import { DepositPaymentListPage }  from "@/features/invoice/pages/DepositPaymentListPage";
import { InvoicePaymentListPage }  from "@/features/invoice/pages/InvoicePaymentListPage";
import { CommissionListPage }    from "@/features/commission/pages/CommissionListPage";
import { MyCommissionPage }      from "@/features/commission/pages/MyCommissionPage";
import { InventoryPage }         from "@/features/inventory/pages/InventoryPage";
import { ReportsPage }           from "@/features/report/pages/ReportsPage";
import { LoanListPage }               from "@/features/loan/pages/LoanListPage";
import { LoanDetailPage }             from "@/features/loan/pages/LoanDetailPage";
import { MyLoanPage }                 from "@/features/loan/pages/MyLoanPage";
import { MyLoanDetailPage }           from "@/features/loan/pages/MyLoanDetailPage";
import { ConsultationListPage }       from "@/features/consultation/pages/ConsultationListPage";
import { ConsultationFormPage }       from "@/features/consultation/pages/ConsultationFormPage";
import { LeavePage }                  from "@/features/leave/pages/LeavePage";
import { MyPayslipPage }             from "@/features/payroll/pages/MyPayslipPage";
import { BpjsReportPage }           from "@/features/payroll/pages/BpjsReportPage";
import { CorrectionPage }            from "@/features/attendance/pages/CorrectionPage";
import { ComplaintPage }             from "@/features/complaint/pages/ComplaintPage";
import { PermissionPage }            from "@/features/attendance/pages/PermissionPage";
import { SickLeavePage }             from "@/features/attendance/pages/SickLeavePage";
import { GenerateKomisiPage }           from "@/features/invoice/pages/GenerateKomisiPage";
import CommissionCalculatorPage        from "@/features/invoice/pages/CommissionCalculatorPage";
import { PurchasePage }              from "@/features/purchase/pages/PurchasePage";
import { PurchaseDetailPage }        from "@/features/purchase/pages/PurchaseDetailPage";
import { SupplierPage }              from "@/features/purchase/pages/SupplierPage";
import { StockOpnamePage }           from "@/features/inventory/pages/StockOpnamePage";
import { MembershipPage }            from "@/features/membership/pages/MembershipPage";
import { ProductionListPage }        from "@/features/production/pages/ProductionListPage";
import { ProductionDetailPage }      from "@/features/production/pages/ProductionDetailPage";
import { ProductionFormPage }        from "@/features/production/pages/ProductionFormPage";
import { StockTransferPage }         from "@/features/inventory/pages/StockTransferPage";
import { StockTransferDetailPage }  from "@/features/inventory/pages/StockTransferDetailPage";
import { PurchaseReturnListPage }    from "@/features/purchaseReturn/pages/PurchaseReturnListPage";
import { PurchaseReturnDetailPage }  from "@/features/purchaseReturn/pages/PurchaseReturnDetailPage";
import { PurchaseReturnFormPage }    from "@/features/purchaseReturn/pages/PurchaseReturnFormPage";
import { FinanceDashboardPage }      from "@/features/dashboard/pages/FinanceDashboardPage";

// ── Role Groups (mirrors sidebarNav.ts) ─────────────────────────────────────
const ADMIN_ROLES        = ["SUPER_ADMIN", "OWNER"]                                     as const;
const MANAGEMENT_ROLES   = ["SUPER_ADMIN", "OWNER", "MANAGER"]                          as const;
const POS_ROLES          = ["SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER"]               as const;

export const router = createBrowserRouter([
  // ── Public routes ──────────────────────────────────────────────────────
  {
    element: <AuthLayout />,
    children: [
      { path: "/login",           element: <LoginPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password",  element: <ResetPasswordPage /> },
    ],
  },

  // ── Protected routes ───────────────────────────────────────────────────
  {
    element: <ProtectedRoute />,                              // auth + branch check
    children: [
      { path: "/branch-select", element: <BranchSelectorPage /> },

      {
        element: <DashboardLayout />,
        children: [

          // ── ALL ROLES ────────────────────────────────────────────────
          { path: "/dashboard",   element: <DashboardPage /> },
          { path: "/leaves",      element: <LeavePage /> },
          { path: "/permissions", element: <PermissionPage /> },
          { path: "/sick-leaves", element: <SickLeavePage /> },
          { path: "/my-payslip",  element: <MyPayslipPage /> },
          { path: "/my-kasbon",      element: <MyLoanPage /> },
          { path: "/my-kasbon/:id",  element: <MyLoanDetailPage /> },
          // Jadwal Saya: self-service untuk semua role
          { path: "/my-schedule",    element: <MySchedulePage /> },
          // Koreksi Kehadiran: self-service untuk semua role (sidebar: ALL_ROLES)
          { path: "/attendance-corrections", element: <CorrectionPage /> },

          // ── STAFF_OPERASIONAL + CASHIER (self-service komisi) ─────
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN","OWNER","MANAGER","CASHIER","STAFF_OPERASIONAL"]} />,
            children: [
              { path: "/my-commission", element: <MyCommissionPage /> },
            ],
          },

          // ── Operasional: incl. STAFF_OPERASIONAL + OFFICE + FINANCE (view-only handled in page)
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN","OWNER","MANAGER","CASHIER","STAFF_OPERASIONAL","OFFICE","FINANCE"]} />,
            children: [
              { path: "/booking-harian",          element: <DailyBoardPage /> },
              { path: "/consultation-notes",      element: <ConsultationListPage /> },
              { path: "/consultation-notes/new",  element: <ConsultationFormPage /> },
              { path: "/consultation-notes/:id/edit", element: <ConsultationFormPage /> },
            ],
          },

          // ── Operasional: POS + OFFICE + FINANCE (no STAFF_OPERASIONAL)
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN","OWNER","MANAGER","CASHIER","OFFICE","FINANCE"]} />,
            children: [
              { path: "/appointments",     element: <AppointmentListPage /> },
              { path: "/appointments/:id", element: <AppointmentDetailPage /> },
              { path: "/complaints",       element: <ComplaintPage /> },
              { path: "/invoices",         element: <InvoiceListPage /> },
              { path: "/invoices/:id",     element: <InvoiceDetailPage /> },
              { path: "/deposits",             element: <DepositListPage /> },
              { path: "/deposits/:id",         element: <DepositDetailPage /> },
              { path: "/deposits/:id/pay",     element: <DepositPaymentPage /> },
              { path: "/deposit-payments",     element: <DepositPaymentListPage /> },
              { path: "/invoice-payments",     element: <InvoicePaymentListPage /> },
            ],
          },

          // ── Data: Customers — POS + OFFICE (full) + FINANCE (view-only)
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN","OWNER","MANAGER","CASHIER","OFFICE","FINANCE"]} />,
            children: [
              { path: "/customers",     element: <CustomerListPage /> },
              { path: "/customers/:id", element: <CustomerDetailPage /> },
            ],
          },

          // ── Data: Employees, Schedule, Attendance — MANAGEMENT + OFFICE + FINANCE
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN","OWNER","MANAGER","OFFICE","FINANCE"]} />,
            children: [
              { path: "/employees",     element: <EmployeeListPage /> },
              { path: "/employees/:id", element: <EmployeeDetailPage /> },
              { path: "/schedule",      element: <SchedulePage /> },
              { path: "/attendance",    element: <TeamPage /> },
            ],
          },

          // ── Data: Inventory & Pembelian — MANAGEMENT + INVENTORY + FINANCE + OFFICE (view-only)
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN","OWNER","MANAGER","INVENTORY","FINANCE","OFFICE"]} />,
            children: [
              { path: "/inventory",          element: <InventoryPage /> },
              { path: "/purchases",          element: <PurchasePage /> },
              { path: "/purchases/:id",      element: <PurchaseDetailPage /> },
              { path: "/suppliers",          element: <SupplierPage /> },
              { path: "/purchase-returns",     element: <PurchaseReturnListPage /> },
              { path: "/purchase-returns/new", element: <PurchaseReturnFormPage /> },
              { path: "/purchase-returns/:id", element: <PurchaseReturnDetailPage /> },
            ],
          },

          // ── Data: Stock Opname — MANAGEMENT + INVENTORY + FINANCE
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN","OWNER","MANAGER","INVENTORY","FINANCE"]} />,
            children: [
              { path: "/stock-opname", element: <StockOpnamePage /> },
            ],
          },

          // ── Production & Transfer Stok — MANAGEMENT + INVENTORY
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN","OWNER","MANAGER","INVENTORY"]} />,
            children: [
              { path: "/production",            element: <ProductionListPage /> },
              { path: "/production/new",        element: <ProductionFormPage /> },
              { path: "/production/:id",        element: <ProductionDetailPage /> },
              { path: "/stock-transfers",       element: <StockTransferPage /> },
              { path: "/stock-transfers/:id",   element: <StockTransferDetailPage /> },
            ],
          },

          // ── Data: Membership — semua role bisa lihat, write dibatasi di page
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN","OWNER","MANAGER","CASHIER","STAFF_OPERASIONAL","INVENTORY","OFFICE","FINANCE"]} />,
            children: [
              { path: "/memberships", element: <MembershipPage /> },
            ],
          },

          // ── Keuangan: Commissions & Kasbon — MANAGEMENT (view) + FINANCE (full)
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN","OWNER","MANAGER","FINANCE"]} />,
            children: [
              { path: "/commissions", element: <CommissionListPage /> },
              { path: "/loans",       element: <LoanListPage /> },
              { path: "/loans/:id",   element: <LoanDetailPage /> },
            ],
          },

          // ── Keuangan: Payroll & Generate Komisi — ADMIN + FINANCE
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN","OWNER","FINANCE"]} />,
            children: [
              { path: "/payroll",     element: <PayrollPage /> },
              { path: "/payroll/bpjs", element: <BpjsReportPage /> },
              { path: "/generate-komisi",               element: <GenerateKomisiPage /> },
              { path: "/generate-komisi/:id/calculator", element: <CommissionCalculatorPage /> },
            ],
          },

          // ── Reports — MANAGEMENT + INVENTORY + OFFICE + FINANCE
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN","OWNER","MANAGER","INVENTORY","OFFICE","FINANCE"]} />,
            children: [
              { path: "/reports", element: <ReportsPage /> },
            ],
          },

          // ── Finance Dashboard — ADMIN + FINANCE + MANAGER
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN","OWNER","MANAGER","FINANCE"]} />,
            children: [
              { path: "/finance", element: <FinanceDashboardPage /> },
            ],
          },

          // ── Settings — ADMIN only
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN","OWNER"]} />,
            children: [
              { path: "/settings", element: <SettingsPage /> },
            ],
          },

        ],
      },
    ],
  },

  // ── Fallback ──────────────────────────────────────────────────────────
  { path: "/",  element: <Navigate to="/dashboard" replace /> },
  { path: "*",  element: <Navigate to="/dashboard" replace /> },
]);
