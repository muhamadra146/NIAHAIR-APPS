import { Pencil, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "../../types";

interface Props {
  users:         User[];
  isLoading:     boolean;
  onEdit:        (user: User) => void;
  onResetPw:     (user: User) => void;
}

function LoadingState() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  );
}

function EmptyState() {
  return <div className="py-12 text-center text-sm text-muted-foreground">No user accounts found.</div>;
}

function MobileCardList({ users, onEdit, onResetPw }: { users: User[]; onEdit: (u: User) => void; onResetPw: (u: User) => void }) {
  return (
    <div className="divide-y divide-border md:hidden">
      {users.map((u) => (
        <div key={u.id} className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{u.email}</p>
            <p className="text-xs text-muted-foreground">{u.employee?.name ?? "—"}</p>
            <div className="mt-1 flex gap-1">
              <Badge variant="secondary" className="text-xs">{u.role.name}</Badge>
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
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Employee</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">User Role</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-border transition-colors hover:bg-muted/30">
              <td className="px-4 py-3 font-medium">{u.email}</td>
              <td className="px-4 py-3 text-muted-foreground">{u.employee?.name ?? "—"}</td>
              <td className="px-4 py-3"><Badge variant="secondary">{u.role.name}</Badge></td>
              <td className="px-4 py-3">
                <Badge variant={u.isActive ? "success" : "secondary"}>
                  {u.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="px-4 py-3">
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
