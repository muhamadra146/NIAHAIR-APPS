import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useLayout } from "@/contexts/LayoutContext";
import { sidebarNav, type NavItem } from "@/layouts/config/sidebarNav";
import logoSrc from "@/assets/logo-niahair.png";
import type { UserRole } from "@/types/auth";

// ── NavLink ───────────────────────────────────────────────────────────────────

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { pathname }     = useLocation();
  const { closeSidebar } = useLayout();
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon   = item.icon;

  return (
    <li>
      <Link
        to={item.href}
        onClick={closeSidebar}
        title={collapsed ? item.label : undefined}
        className={cn(
          "flex items-center rounded-md py-2 text-sm font-medium transition-colors",
          collapsed ? "justify-center px-2" : "gap-3 px-3",
          active
            ? "bg-sidebar-primary text-white"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>

      {/* Sub-items — only when expanded */}
      {!collapsed && item.children && active && (
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

// ── UserFooter ────────────────────────────────────────────────────────────────

function UserFooter({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuthStore();
  const displayName = user?.employee?.name ?? user?.email ?? "";
  const initial     = displayName.charAt(0).toUpperCase() || "?";

  return (
    <div className={cn(
      "border-t border-sidebar-border p-3",
      collapsed ? "flex justify-center" : ""
    )}>
      {collapsed ? (
        <div
          title={displayName}
          className="flex h-8 w-8 shrink-0 cursor-default items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-primary"
        >
          {initial}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-primary">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-sidebar-foreground">{displayName}</p>
            <p className="truncate text-xs text-sidebar-foreground/50">{user?.roleCode}</p>
          </div>
          <button
            onClick={logout}
            className="text-xs text-sidebar-foreground/40 transition-colors hover:text-sidebar-foreground"
            title="Logout"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar() {
  const roleCode = useAuthStore((s) => s.user?.roleCode) as UserRole | undefined;
  const { sidebarCollapsed, toggleCollapsed } = useLayout();

  const visibleNav = sidebarNav.filter(
    (item) => roleCode && item.roles.includes(roleCode)
  );

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-sidebar-border bg-sidebar shadow-[1px_0_12px_0_rgba(0,0,0,0.06)] transition-[width] duration-200 ease-in-out overflow-hidden",
        sidebarCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className={cn(
        "flex h-20 shrink-0 items-center border-b border-sidebar-border",
        sidebarCollapsed ? "justify-center px-2" : "justify-center px-4"
      )}>
        {sidebarCollapsed ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary/15 text-base font-bold text-sidebar-primary select-none">
            N
          </div>
        ) : (
          <img
            src={logoSrc}
            alt="NIA HAIR"
            className="h-14 w-auto object-contain"
            draggable={false}
          />
        )}
      </div>

      {/* ── Collapse toggle button ───────────────────────────── */}
      <button
        type="button"
        onClick={toggleCollapsed}
        title={sidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}
        className="absolute -right-3 top-[72px] z-20 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar shadow-sm text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
      >
        {sidebarCollapsed
          ? <ChevronRight className="h-3 w-3" />
          : <ChevronLeft  className="h-3 w-3" />
        }
      </button>

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        <ul className="space-y-0.5">
          {visibleNav.map((item) => (
            <NavLink key={item.href} item={item} collapsed={sidebarCollapsed} />
          ))}
        </ul>
      </nav>

      <UserFooter collapsed={sidebarCollapsed} />
    </aside>
  );
}
