import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthLayout } from "@/layouts/AuthLayout";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { CustomerListPage } from "@/features/customer/pages/CustomerListPage";
import { CustomerDetailPage } from "@/features/customer/pages/CustomerDetailPage";

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
      {
        element: <DashboardLayout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          // Customers
          { path: "/customers",     element: <CustomerListPage /> },
          { path: "/customers/:id", element: <CustomerDetailPage /> },
        ],
      },
    ],
  },

  // ── Fallback ─────────────────────────────────────────────────────────
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
