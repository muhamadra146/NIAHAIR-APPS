import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Warehouse } from "../../types";

interface Props {
  warehouses: Warehouse[];
  isLoading:  boolean;
  onEdit:     (warehouse: Warehouse) => void;
}

function formatSync(lastSyncAt: string | null) {
  if (!lastSyncAt) return "—";
  return new Date(lastSyncAt).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function LoadingState() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[80px] w-full rounded-lg" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-14 text-center text-sm text-muted-foreground">
      No warehouses found. Sync from Accurate to populate.
    </div>
  );
}

/* ── Mobile card ─────────────────────────────────────────────────── */
function MobileCardList({ warehouses, onEdit }: { warehouses: Warehouse[]; onEdit: (w: Warehouse) => void }) {
  return (
    <div className="divide-y divide-border md:hidden">
      {warehouses.map((w) => (
        <div key={w.id} className="px-4 py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{w.name}</p>
              {w.accurateWarehouseId && (
                <p className="font-mono text-xs text-muted-foreground">ID: {w.accurateWarehouseId}</p>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onEdit(w)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {w.branch
              ? <Badge variant="secondary" className="text-xs">{w.branch.name}</Badge>
              : <Badge variant="outline" className="text-xs text-muted-foreground">No branch</Badge>
            }
            <Badge variant={w.isActive ? "default" : "secondary"} className="text-xs">
              {w.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">Last sync: </span>{formatSync(w.lastSyncAt)}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── Desktop table ───────────────────────────────────────────────── */
function DesktopTable({ warehouses, onEdit }: { warehouses: Warehouse[]; onEdit: (w: Warehouse) => void }) {
  return (
    <div className="hidden md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Accurate ID</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Branch</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Sync</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {warehouses.map((w) => (
            <tr key={w.id} className="border-b border-border transition-colors hover:bg-muted/30">
              <td className="px-4 py-3 font-medium">{w.name}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {w.accurateWarehouseId ?? "—"}
              </td>
              <td className="px-4 py-3">
                {w.branch
                  ? <Badge variant="secondary">{w.branch.name}</Badge>
                  : <span className="text-muted-foreground">—</span>
                }
              </td>
              <td className="px-4 py-3">
                <Badge variant={w.isActive ? "default" : "secondary"}>
                  {w.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatSync(w.lastSyncAt)}</td>
              <td className="px-4 py-3">
                <Button variant="ghost" size="icon" onClick={() => onEdit(w)}>
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

export function WarehouseTable({ warehouses, isLoading, onEdit }: Props) {
  if (isLoading) return <LoadingState />;
  if (warehouses.length === 0) return <EmptyState />;
  return (
    <>
      <MobileCardList warehouses={warehouses} onEdit={onEdit} />
      <DesktopTable   warehouses={warehouses} onEdit={onEdit} />
    </>
  );
}
