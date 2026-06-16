import { useState } from "react";
import { Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Employee } from "../../types";

interface Props {
  employees: Employee[];
  isLoading: boolean;
  onEdit:    (employee: Employee) => void;
  onDelete:  (employee: Employee) => void;
}

function LoadingState() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-[88px] w-full rounded-lg" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-14 text-center text-sm text-muted-foreground">
      No employees found.
    </div>
  );
}

/* ── Mobile card ─────────────────────────────────────────────────── */
function MobileCardList({ employees, onEdit, onDelete }: Omit<Props, "isLoading">) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="divide-y divide-border md:hidden">
      {employees.map((emp) => (
        <div key={emp.id} className="px-4 py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {emp.employeeCode && (
                <p className="font-mono text-xs text-muted-foreground">{emp.employeeCode}</p>
              )}
              <p className="truncate text-sm font-semibold text-foreground">{emp.name}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {confirmId === emp.id ? (
                <>
                  <Button variant="destructive" size="sm" className="h-7 text-xs px-2"
                    onClick={() => { onDelete(emp); setConfirmId(null); }}>
                    Hapus
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2"
                    onClick={() => setConfirmId(null)}>
                    Batal
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(emp)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setConfirmId(emp.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">{emp.role.name}</Badge>
          </div>

          <div className="mt-2 space-y-0.5">
            {emp.homeBranch && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/70">Home: </span>
                {emp.homeBranch.name}
              </p>
            )}
            {emp.employeeBranches.length > 0 && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/70">Access: </span>
                {emp.employeeBranches.map((eb) => eb.branch.name).join(", ")}
              </p>
            )}
            {emp.phone && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/70">Phone: </span>{emp.phone}
              </p>
            )}
          </div>

          {confirmId === emp.id && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Karyawan akan dinonaktifkan. Konfirmasi?
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Desktop table ───────────────────────────────────────────────── */
function DesktopTable({ employees, onEdit, onDelete }: Omit<Props, "isLoading">) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="hidden md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Home Branch</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Access Branches</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id} className="border-b border-border transition-colors hover:bg-muted/30">
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{emp.employeeCode ?? "—"}</td>
              <td className="px-4 py-3">
                <p className="font-medium">{emp.name}</p>
                {emp.email && <p className="text-xs text-muted-foreground">{emp.email}</p>}
              </td>
              <td className="px-4 py-3">
                <Badge variant="secondary">{emp.role.name}</Badge>
              </td>
              <td className="px-4 py-3">
                {emp.homeBranch
                  ? <Badge variant="outline" className="text-xs font-normal">{emp.homeBranch.code}</Badge>
                  : <span className="text-muted-foreground">—</span>
                }
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {emp.employeeBranches.length === 0
                    ? <span className="text-muted-foreground">—</span>
                    : emp.employeeBranches.map((eb) => (
                        <Badge key={eb.id} variant="outline" className="text-xs">{eb.branch.code}</Badge>
                      ))
                  }
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                {confirmId === emp.id ? (
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Nonaktifkan?
                    </span>
                    <Button variant="destructive" size="sm" className="h-7 text-xs"
                      onClick={() => { onDelete(emp); setConfirmId(null); }}>
                      Ya
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs"
                      onClick={() => setConfirmId(null)}>
                      Batal
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(emp)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmId(emp.id)}>
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

export function EmployeeTable({ employees, isLoading, onEdit, onDelete }: Props) {
  if (isLoading) return <LoadingState />;
  if (employees.length === 0) return <EmptyState />;
  return (
    <>
      <MobileCardList employees={employees} onEdit={onEdit} onDelete={onDelete} />
      <DesktopTable   employees={employees} onEdit={onEdit} onDelete={onDelete} />
    </>
  );
}
