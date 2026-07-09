import { useState } from "react";
import { Pencil, KeyRound, Trash2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { User } from "../../types";

interface Props {
  users:     User[];
  isLoading: boolean;
  onEdit:    (user: User) => void;
  onResetPw: (user: User) => void;
  onDelete:  (user: User) => void;
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

function MobileCardList({ users, onEdit, onResetPw, onDelete }: Omit<Props, "isLoading">) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="divide-y divide-slate-100 md:hidden">
      {users.map((u) => (
        <div key={u.id} className="px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{u.email}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {u.username && <span className="font-mono mr-2 text-slate-400">@{u.username}</span>}
                {u.employee?.name ?? "—"}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <RoleBadge code={u.role.code} name={u.role.name} />
                <Badge variant={u.isActive ? "success" : "secondary"} className="text-xs">
                  {u.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              {confirmId === u.id ? (
                <>
                  <Button variant="destructive" size="sm" className="h-7 text-xs px-2"
                    onClick={() => { onDelete(u); setConfirmId(null); }}>
                    Hapus
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2"
                    onClick={() => setConfirmId(null)}>
                    Batal
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="icon" onClick={() => onResetPw(u)} title="Reset password">
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(u)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmId(u.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
          {confirmId === u.id && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              User akan dihapus permanen. Konfirmasi?
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DesktopTable({ users, onEdit, onResetPw, onDelete }: Omit<Props, "isLoading">) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70">
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Username</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Employee</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">User Role</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((u) => (
            <tr key={u.id} className="transition-colors hover:bg-slate-50">
              <td className="px-5 py-4 font-medium text-slate-900">{u.email}</td>
              <td className="px-5 py-4 text-slate-500">
                {u.username
                  ? <span className="font-mono text-sm">@{u.username}</span>
                  : <span className="text-slate-300">—</span>
                }
              </td>
              <td className="px-5 py-4 text-slate-500">{u.employee?.name ?? "—"}</td>
              <td className="px-5 py-4">
                <RoleBadge code={u.role.code} name={u.role.name} />
              </td>
              <td className="px-5 py-4">
                <Badge variant={u.isActive ? "success" : "secondary"}>
                  {u.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="px-5 py-4 text-right">
                {confirmId === u.id ? (
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Hapus permanen?
                    </span>
                    <Button variant="destructive" size="sm" className="h-7 text-xs"
                      onClick={() => { onDelete(u); setConfirmId(null); }}>
                      Ya
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs"
                      onClick={() => setConfirmId(null)}>
                      Batal
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onResetPw(u)} title="Reset password">
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmId(u.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UserTable({ users, isLoading, onEdit, onResetPw, onDelete }: Props) {
  if (isLoading) return <LoadingState />;
  if (users.length === 0) return <EmptyState />;
  return (
    <>
      <MobileCardList users={users} onEdit={onEdit} onResetPw={onResetPw} onDelete={onDelete} />
      <DesktopTable   users={users} onEdit={onEdit} onResetPw={onResetPw} onDelete={onDelete} />
    </>
  );
}
