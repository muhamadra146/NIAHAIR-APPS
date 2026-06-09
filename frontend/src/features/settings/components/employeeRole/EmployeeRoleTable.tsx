import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { EmployeeRole } from "../../types";

interface Props {
  roles:     EmployeeRole[];
  isLoading: boolean;
  onEdit:    (role: EmployeeRole) => void;
}

export function EmployeeRoleTable({ roles, isLoading, onEdit }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }
  if (roles.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No roles yet.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-muted/50">
          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Code</th>
          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
          <th className="px-3 py-2 text-right font-medium text-muted-foreground">Actions</th>
        </tr>
      </thead>
      <tbody>
        {roles.map((role) => (
          <tr key={role.id} className="border-b border-border transition-colors hover:bg-muted/30">
            <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{role.code}</td>
            <td className="px-3 py-2 font-medium">{role.name}</td>
            <td className="px-3 py-2 text-right">
              <Button variant="ghost" size="icon" onClick={() => onEdit(role)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
