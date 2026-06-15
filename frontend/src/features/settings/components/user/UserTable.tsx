import { Pencil, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { User } from "../../types";

interface Props {
  users:         User[];
  isLoading:     boolean;
  onEdit:        (user: User) => void;
  onResetPw:     (user: User) => void;
}

function getRoleBadgeClass(roleCode: string): string {
  switch (roleCode) {
    case "SUPER_ADMIN": return "bg-slate-100 text-slate-800 border border-slate-200";
    case "OWNER":       return "bg-violet-50 text-violet-700 border border-violet-100";
    case "MANAGER":     return "bg-indigo-50 text-indigo-700 border border-indigo-100";
    case "CASHIER":     return "bg-amber-50 text-amber-700 border border-amber-100";
    case "FINANCE":     return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "STAFF":
    case "STYLIST":
    default:            return "bg-blue-50 text-blue-700 border border-blue-100";
  }
}

function RoleBadge({ code, name }: { code: string; name: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
      getRoleBadgeClass(code)
    )}>
      {name}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  );
}

function EmptyState() {
  return <div className="py-12 text-center text-sm text-slate-400">No user accounts found.</div>;
}

function MobileCardList({ users, onEdit, onResetPw }: { users: User[]; onEdit: (u: User) => void; onResetPw: (u: User) => void }) {
  return (
    <div className="divide-y divide-slate-100 md:hidden">
      {users.map((u) => (
        <div key={u.id} className="flex items-start justify-between gap-3 px-4 py-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{u.email}</p>
            <p className="mt-0.5 text-xs text-slate-500">{u.employee?.name ?? "—"}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <RoleBadge code={u.role.code} name={u.role.name} />
              <Badge variant={u.isActive ? "success" : "secondary"} className="text-xs">
                {u.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" onClick={() => onResetPw(u)} title="Reset password">
              <KeyRound className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(u)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DesktopTable({ users, onEdit, onResetPw }: { users: User[]; onEdit: (u: User) => void; onResetPw: (u: User) => void }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70">
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Employee</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">User Role</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((u) => (
            <tr key={u.id} className="transition-colors hover:bg-slate-50">
              <td className="px-5 py-4 font-medium text-slate-900">{u.email}</td>
              <td className="px-5 py-4 text-slate-500">{u.employee?.name ?? "—"}</td>
              <td className="px-5 py-4">
                <RoleBadge code={u.role.code} name={u.role.name} />
              </td>
              <td className="px-5 py-4">
                <Badge variant={u.isActive ? "success" : "secondary"}>
                  {u.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="px-5 py-4">
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onResetPw(u)} title="Reset password">
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(u)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UserTable({ users, isLoading, onEdit, onResetPw }: Props) {
  if (isLoading) return <LoadingState />;
  if (users.length === 0) return <EmptyState />;
  return (
    <>
      <MobileCardList users={users} onEdit={onEdit} onResetPw={onResetPw} />
      <DesktopTable   users={users} onEdit={onEdit} onResetPw={onResetPw} />
    </>
  );
}
