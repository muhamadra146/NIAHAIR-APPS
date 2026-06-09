import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaymentMethod } from "../../types";

interface Props {
  methods:   PaymentMethod[];
  isLoading: boolean;
  onEdit:    (m: PaymentMethod) => void;
  onDelete:  (m: PaymentMethod) => void;
}

function LoadingState() {
  return <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
}
function EmptyState() {
  return <div className="py-12 text-center text-sm text-muted-foreground">No payment methods found.</div>;
}

function MobileCardList({ methods, onEdit, onDelete }: { methods: PaymentMethod[]; onEdit: (m: PaymentMethod) => void; onDelete: (m: PaymentMethod) => void }) {
  return (
    <div className="divide-y divide-border md:hidden">
      {methods.map((m) => (
        <div key={m.id} className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm">{m.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{m.code}</p>
            {m.cashAccount && <p className="text-xs text-muted-foreground">{m.cashAccount.name}</p>}
            <Badge variant={m.isActive ? "success" : "secondary"} className="mt-1 text-xs">
              {m.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onDelete(m)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(m)}><Pencil className="h-4 w-4" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DesktopTable({ methods, onEdit, onDelete }: { methods: PaymentMethod[]; onEdit: (m: PaymentMethod) => void; onDelete: (m: PaymentMethod) => void }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cash Account</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {methods.map((m) => (
            <tr key={m.id} className="border-b border-border transition-colors hover:bg-muted/30">
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.code}</td>
              <td className="px-4 py-3 font-medium">{m.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{m.cashAccount?.name ?? "—"}</td>
              <td className="px-4 py-3"><Badge variant={m.isActive ? "success" : "secondary"}>{m.isActive ? "Active" : "Inactive"}</Badge></td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onDelete(m)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(m)}><Pencil className="h-4 w-4" /></Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PaymentMethodTable({ methods, isLoading, onEdit, onDelete }: Props) {
  if (isLoading) return <LoadingState />;
  if (methods.length === 0) return <EmptyState />;
  return (
    <>
      <MobileCardList methods={methods} onEdit={onEdit} onDelete={onDelete} />
      <DesktopTable   methods={methods} onEdit={onEdit} onDelete={onDelete} />
    </>
  );
}
