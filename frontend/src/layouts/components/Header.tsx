import { Menu, ChevronsUpDown } from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useLayout } from "@/contexts/LayoutContext";
import { sidebarNav } from "@/layouts/config/sidebarNav";
import { Button } from "@/components/ui/button";
import logoSrc from "@/assets/logo-niahair.png";

function usePageTitle() {
  const { pathname } = useLocation();
  const match = sidebarNav.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
  return match?.label ?? "NIAHAIR";
}

function UserAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase() || "?";
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
      {initial}
    </div>
  );
}

export function Header() {
  const { user, branchId } = useAuthStore();
  const { toggleSidebar }  = useLayout();
  const pageTitle          = usePageTitle();
  const navigate           = useNavigate();

  const displayName  = user?.employee?.name ?? user?.email ?? "";
  const activeBranch = user?.branches.find((b) => b.id === branchId);
  const canSwitch    = (user?.branches.length ?? 0) > 1;

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-slate-200/80 bg-white px-4 shadow-sm sm:h-16 sm:px-6">
      {/* Hamburger — mobile only */}
      <Button
        variant="ghost"
        size="icon"
        className="mr-2 text-muted-foreground hover:text-foreground lg:hidden"
        onClick={toggleSidebar}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile center: logo */}
      <div className="flex flex-1 justify-center lg:hidden">
        <img
          src={logoSrc}
          alt="NIA HAIR"
          className="h-8 w-auto object-contain"
          draggable={false}
        />
      </div>

      {/* Desktop left: page title + branch badge */}
      <div className="hidden flex-1 items-center gap-3 lg:flex">
        <span className="text-sm font-semibold text-slate-800">{pageTitle}</span>
        {activeBranch && (
          <button
            onClick={() => canSwitch && navigate("/branch-select")}
            className={`inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 transition-colors ${
              canSwitch ? "cursor-pointer hover:bg-slate-200" : "cursor-default"
            }`}
            title={canSwitch ? "Click to switch branch" : undefined}
          >
            {activeBranch.name}
            {canSwitch && <ChevronsUpDown className="h-3 w-3" />}
          </button>
        )}
      </div>

      {/* Right: user — click to open profile */}
      {user?.employee?.id ? (
        <Link
          to={`/employees/${user.employee.id}`}
          className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-slate-100"
          title="Lihat profil saya"
        >
          <span className="hidden text-sm text-muted-foreground lg:block">{displayName}</span>
          <UserAvatar name={displayName} />
        </Link>
      ) : (
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground lg:block">{displayName}</span>
          <UserAvatar name={displayName} />
        </div>
      )}
    </header>
  );
}
