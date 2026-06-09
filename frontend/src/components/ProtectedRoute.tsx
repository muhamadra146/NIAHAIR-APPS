import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import type { UserRole } from "@/types/auth";

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
    return <Navigate to="/dashboard" replace />;
  }

  // If user has branches but none selected, require branch selection
  if (
    user.branches.length > 0 &&
    !branchId &&
    location.pathname !== "/branch-select"
  ) {
    return <Navigate to="/branch-select" replace />;
  }

  return <Outlet />;
}
