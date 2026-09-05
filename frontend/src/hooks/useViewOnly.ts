import { useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { sidebarNav } from "@/layouts/config/sidebarNav";
import type { UserRole } from "@/types/auth";

/**
 * Returns `true` when the current user has "View Only" access to the current page.
 *
 * View Only means the user can read data but should NOT see write actions
 * (Tambah, Edit, Delete buttons). Controlled via `viewOnlyRoles` in sidebarNav.ts.
 *
 * @example
 * const isViewOnly = useViewOnly();
 * {!isViewOnly && <Button>Tambah Data</Button>}
 */
export function useViewOnly(): boolean {
  const { user } = useAuthStore();
  const { pathname } = useLocation();

  if (!user?.roleCode) return false;

  const roleCode = user.roleCode as UserRole;

  // Find matching nav item (check parent href or children hrefs)
  const navItem = sidebarNav.find((item) => {
    if (pathname.startsWith(item.href) && item.href !== "/") return true;
    return item.children?.some((child) => pathname.startsWith(child.href));
  });

  if (!navItem) return false;

  // Check parent viewOnlyRoles
  if (navItem.viewOnlyRoles?.includes(roleCode)) return true;

  // Check children viewOnlyRoles (for sub-paths like /deposits/:id)
  const child = navItem.children?.find((c) => pathname.startsWith(c.href));
  if (child?.viewOnlyRoles?.includes(roleCode)) return true;

  return false;
}
