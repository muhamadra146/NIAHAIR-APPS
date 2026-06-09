import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useLayout } from "@/contexts/LayoutContext";
import { sidebarNav, type NavItem } from "@/layouts/config/sidebarNav";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import logoSrc from "@/assets/logo-niahair.png";
import type { UserRole } from "@/types/auth";

function MobileNavLink({ item }: { item: NavItem }) {
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
          "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-sidebar-primary text-white"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span>{item.label}</span>
      </Link>
      {item.children && active && (
        <ul className="ml-8 mt-1 space-y-1">
          {item.children.map((child) => (
            <li key={child.href}>
              <Link
                to={child.href}
                onClick={closeSidebar}
                className={cn(
                  "flex items-center rounded-md px-3 py-1.5 text-xs transition-colors",
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

export function MobileSidebar() {
  const { sidebarOpen, closeSidebar } = useLayout();
  const roleCode = useAuthStore((s) => s.user?.roleCode) as UserRole | undefined;

  const visibleNav = sidebarNav.filter(
    (item) => roleCode && item.roles.includes(roleCode)
  );

  return (
    <Sheet open={sidebarOpen} onOpenChange={(open) => !open && closeSidebar()}>
      <SheetContent side="left" showClose={false}>
        {/* Logo */}
        <div className="flex h-20 items-center justify-center border-b border-sidebar-border px-4">
          <img
            src={logoSrc}
            alt="NIA HAIR"
            className="h-14 w-auto object-contain"
            draggable={false}
          />
        </div>

        <SheetTitle className="sr-only">Navigation</SheetTitle>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-0.5">
            {visibleNav.map((item) => (
              <MobileNavLink key={item.href} item={item} />
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
