import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useLayout } from "@/contexts/LayoutContext";
import { sidebarNav, type NavItem } from "@/layouts/config/sidebarNav";
import logoSrc from "@/assets/logo-niahair.png";
import type { UserRole } from "@/types/auth";

function NavLink({ item }: { item: NavItem }) {
  const { pathname }     = useLocation();
  const { closeSidebar } = useLayout();
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon   = item.icon;

  return (
    <li>
      <Link
        to={item.href}
        onClick={closeSidebar}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-sidebar-primary text-white"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span>{item.label}</span>
      </Link>
      {item.children && active && (
        <ul className="ml-7 mt-1 space-y-1">
          {item.children.map((child) => (
            <li key={child.href}>
              <Link
                to={child.href}
                onClick={closeSidebar}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors",
                  pathname === child.href
                    ? "text-sidebar-primary font-medium"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
                )}
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function Sidebar() {
  const roleCode = useAuthStore((s) => s.user?.roleCode) as UserRole | undefined;

  const visibleNav = sidebarNav.filter(
    (item) => roleCode && item.roles.includes(roleCode)
  );

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-20 items-center justify-center border-b border-sidebar-border px-4">
        <img
          src={logoSrc}
          alt="NIA HAIR"
          className="h-14 w-auto object-contain"
          draggable={false}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {visibleNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </ul>
      </nav>

      <UserFooter />
    </aside>
  );
}

function UserFooter() {
  const { user, logout } = useAuthStore();

  const displayName = user?.employee?.name ?? user?.email ?? "";
  const initial     = displayName.charAt(0).toUpperCase() || "?";

  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-primary">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-sidebar-foreground">
            {displayName}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/50">
            {user?.roleCode}
          </p>
        </div>
        <button
          onClick={logout}
          className="text-xs text-sidebar-foreground/40 transition-colors hover:text-sidebar-foreground"
          title="Logout"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
