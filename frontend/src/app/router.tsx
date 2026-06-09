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
import { SettingsPage } from "@/features/settings/pages/SettingsPage";

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
          { path: "/appointments",     element: <AppointmentListPage /> },
          { path: "/appointments/:id", element: <AppointmentDetailPage /> },
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
