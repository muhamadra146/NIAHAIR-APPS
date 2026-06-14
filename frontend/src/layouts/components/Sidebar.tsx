import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
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
  const active = pathname === item.href
    || pathname.startsWith(item.href + "/")
    || (item.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + "/")) ?? false);
  const Icon = item.icon;

  return (
    <li>
      <Link
        to={item.href}
        onClick={closeSidebar}
        title={collapsed ? item.label : undefined}
        className={cn(
          "group relative flex items-center rounded-xl py-2 text-sm font-medium transition-all duration-150",
          collapsed ? "justify-center px-2.5" : "gap-3 px-3",
          active
            ? "bg-sidebar-primary text-white shadow-sm shadow-sidebar-primary/30"
            : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        {active && !collapsed && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-white/60" />
        )}
        <Icon className={cn(
          "shrink-0 transition-transform duration-150",
          collapsed ? "h-[18px] w-[18px]" : "h-4 w-4",
          active ? "text-white" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
        )} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>

      {/* Sub-items — only when expanded */}
      {!collapsed && item.children && active && (
        <ul className="ml-9 mt-0.5 space-y-0.5 pb-1">
          {item.children.map((child) => (
            <li key={child.href}>
              <Link
                to={child.href}
                onClick={closeSidebar}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors",
                  pathname === child.href || pathname.startsWith(child.href + "/")
                    ? "text-sidebar-primary font-semibold"
                    : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
                )}
              >
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  pathname === child.href || pathname.startsWith(child.href + "/")
                    ? "bg-sidebar-primary"
                    : "bg-sidebar-foreground/30"
                )} />
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <li className="mx-auto my-2 h-px w-6 rounded-full bg-sidebar-border/60" />;
  }
  return (
    <li className="mb-1 mt-3 px-3">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 select-none">
        {label}
      </span>
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
      "border-t border-sidebar-border/60 p-3",
      collapsed ? "flex justify-center" : ""
    )}>
      {collapsed ? (
        <button
          onClick={logout}
          title={`${displayName} — Logout`}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-sidebar-primary/15 text-sm font-bold text-sidebar-primary hover:bg-sidebar-primary/25 transition-colors"
        >
          {initial}
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary/15 text-sm font-bold text-sidebar-primary">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-sidebar-foreground">{displayName}</p>
            <p className="truncate text-[10px] text-sidebar-foreground/40 uppercase tracking-wide">{user?.roleCode}</p>
          </div>
          <button
            onClick={logout}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-sidebar-foreground/30 transition-colors hover:bg-red-500/10 hover:text-red-500"
            title="Logout"
          >
            <LogOut className="h-3.5 w-3.5" />
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

  // Group items by their group label
  const grouped: { label: string; items: NavItem[] }[] = [];
  for (const item of visibleNav) {
    const groupLabel = item.group ?? "";
    const existing = grouped.find((g) => g.label === groupLabel);
    if (existing) {
      existing.items.push(item);
    } else {
      grouped.push({ label: groupLabel, items: [item] });
    }
  }

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out overflow-visible",
        sidebarCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className={cn(
        "flex h-[68px] shrink-0 items-center border-b border-sidebar-border/60 overflow-hidden",
        sidebarCollapsed ? "justify-center px-2" : "justify-center px-5"
      )}>
        {sidebarCollapsed ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-black text-white select-none shadow-sm">
            N
          </div>
        ) : (
          <img
            src={logoSrc}
            alt="NIA HAIR"
            className="h-12 w-auto object-contain"
            draggable={false}
          />
        )}
      </div>

      {/* ── Collapse toggle button ───────────────────────────── */}
      <button
        type="button"
        onClick={toggleCollapsed}
        title={sidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}
        className="absolute -right-3.5 top-[52px] z-30 flex h-7 w-7 items-center justify-center rounded-full border border-sidebar-border bg-white shadow-md text-sidebar-foreground/50 hover:bg-sidebar-primary hover:text-white hover:border-sidebar-primary transition-all duration-150"
      >
        {sidebarCollapsed
          ? <ChevronRight className="h-3.5 w-3.5" />
          : <ChevronLeft  className="h-3.5 w-3.5" />
        }
      </button>

      {/* ── Nav + Footer (clipped) ───────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
          <ul className="space-y-0.5">
            {grouped.map((group, gi) => (
              <>
                {gi > 0 && <SectionLabel key={`sep-${group.label}`} label={group.label} collapsed={sidebarCollapsed} />}
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} collapsed={sidebarCollapsed} />
                ))}
              </>
            ))}
          </ul>
        </nav>

        <UserFooter collapsed={sidebarCollapsed} />
      </div>
    </aside>
  );
}
