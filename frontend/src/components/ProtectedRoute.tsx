import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/lib/toast";
import type { UserRole } from "@/types/auth";

export const FORBIDDEN_MESSAGE = "Anda tidak punya akses ke halaman itu";

/** URL di luar hak akses peran → kembali ke dashboard dengan pemberitahuan */
function ForbiddenRedirect() {
  useEffect(() => {
    // Ditunda satu tick: saat halaman dibuka langsung (muat penuh), <Toaster> belum terpasang
    // ketika effect ini jalan sehingga toast hilang. id tetap: tidak dobel (StrictMode).
    // Tanpa cleanup: komponen ini langsung dilepas setelah <Navigate> berpindah halaman.
    setTimeout(() => toast.error(FORBIDDEN_MESSAGE, { id: "forbidden-route" }), 0);
  }, []);
  return <Navigate to="/dashboard" replace />;
}

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { token, user, branchId } = useAuthStore();
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.roleCode)) {
    return <ForbiddenRedirect />;
  }

  // No branches at all → must stay on /branch-select (shows "contact admin" screen)
  if (user.branches.length === 0 && location.pathname !== "/branch-select") {
    return <Navigate to="/branch-select" replace />;
  }

  // Has branches but none selected → require branch selection
  if (user.branches.length > 0 && !branchId && location.pathname !== "/branch-select") {
    return <Navigate to="/branch-select" replace />;
  }

  return <Outlet />;
}
