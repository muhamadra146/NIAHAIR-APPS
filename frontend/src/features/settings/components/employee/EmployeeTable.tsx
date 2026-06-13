import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Employee } from "../../types";

interface Props {
  employees: Employee[];
  isLoading: boolean;
  onEdit:    (employee: Employee) => void;
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
function MobileCardList({ employees, onEdit }: { employees: Employee[]; onEdit: (e: Employee) => void }) {
  return (
    <div className="divide-y divide-border md:hidden">
      {employees.map((emp) => (
        <div key={emp.id} className="px-4 py-4">
          {/* Row 1: code + name + action */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {emp.employeeCode && (
                <p className="font-mono text-xs text-muted-foreground">{emp.employeeCode}</p>
              )}
              <p className="truncate text-sm font-semibold text-foreground">{emp.name}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onEdit(emp)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Row 2: role */}
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">{emp.role.name}</Badge>
          </div>

          {/* Row 3: home branch + access branches */}
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
        </div>
      ))}
    </div>
  );
}

/* ── Desktop table ───────────────────────────────────────────────── */
function DesktopTable({ employees, onEdit }: { employees: Employee[]; onEdit: (e: Employee) => void }) {
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
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
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
              <td className="px-4 py-3">
                <Button variant="ghost" size="icon" onClick={() => onEdit(emp)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmployeeTable({ employees, isLoading, onEdit }: Props) {
  if (isLoading) return <LoadingState />;
  if (employees.length === 0) return <EmptyState />;
  return (
    <>
      <MobileCardList employees={employees} onEdit={onEdit} />
      <DesktopTable   employees={employees} onEdit={onEdit} />
    </>
  );
}
