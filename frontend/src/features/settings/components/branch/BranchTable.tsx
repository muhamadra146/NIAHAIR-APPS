import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Branch } from "../../types";

interface Props { branches: Branch[]; isLoading: boolean; onEdit: (b: Branch) => void }

function LoadingState() {
  return <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
}
function EmptyState() {
  return <div className="py-12 text-center text-sm text-muted-foreground">No branches found.</div>;
}

function MobileCardList({ branches, onEdit }: { branches: Branch[]; onEdit: (b: Branch) => void }) {
  return (
    <div className="divide-y divide-border md:hidden">
      {branches.map((b) => (
        <div key={b.id} className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm">{b.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{b.code}</p>
            {b.city && <p className="text-xs text-muted-foreground">{b.city}{b.province ? `, ${b.province}` : ""}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={() => onEdit(b)}><Pencil className="h-4 w-4" /></Button>
        </div>
      ))}
    </div>
  );
}

function DesktopTable({ branches, onEdit }: { branches: Branch[]; onEdit: (b: Branch) => void }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">City</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {branches.map((b) => (
            <tr key={b.id} className="border-b border-border transition-colors hover:bg-muted/30">
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{b.code}</td>
              <td className="px-4 py-3 font-medium">{b.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{b.city ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{b.phone ?? "—"}</td>
              <td className="px-4 py-3">
                <Button variant="ghost" size="icon" onClick={() => onEdit(b)}><Pencil className="h-4 w-4" /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BranchTable({ branches, isLoading, onEdit }: Props) {
  if (isLoading) return <LoadingState />;
  if (branches.length === 0) return <EmptyState />;
  return (
    <>
      <MobileCardList branches={branches} onEdit={onEdit} />
      <DesktopTable   branches={branches} onEdit={onEdit} />
    </>
  );
}
