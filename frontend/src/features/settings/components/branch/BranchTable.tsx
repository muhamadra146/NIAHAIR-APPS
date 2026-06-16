import { useState } from "react";
import { Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Branch } from "../../types";

interface Props { branches: Branch[]; isLoading: boolean; onEdit: (b: Branch) => void; onDelete: (b: Branch) => void }

function LoadingState() {
  return <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
}
function EmptyState() {
  return <div className="py-12 text-center text-sm text-muted-foreground">No branches found.</div>;
}

function MobileCardList({ branches, onEdit, onDelete }: Omit<Props, "isLoading">) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  return (
    <div className="divide-y divide-border md:hidden">
      {branches.map((b) => (
        <div key={b.id} className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{b.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{b.code}</p>
              {b.city && <p className="text-xs text-muted-foreground">{b.city}{b.province ? `, ${b.province}` : ""}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {confirmId === b.id ? (
                <>
                  <Button variant="destructive" size="sm" className="h-7 text-xs px-2"
                    onClick={() => { onDelete(b); setConfirmId(null); }}>
                    Hapus
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2"
                    onClick={() => setConfirmId(null)}>
                    Batal
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(b)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmId(b.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
          {confirmId === b.id && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Cabang akan dinonaktifkan. Konfirmasi?
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DesktopTable({ branches, onEdit, onDelete }: Omit<Props, "isLoading">) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">City</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {branches.map((b) => (
            <tr key={b.id} className="border-b border-border transition-colors hover:bg-muted/30">
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{b.code}</td>
              <td className="px-4 py-3 font-medium">{b.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{b.city ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{b.phone ?? "—"}</td>
              <td className="px-4 py-3 text-right">
                {confirmId === b.id ? (
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Nonaktifkan?
                    </span>
                    <Button variant="destructive" size="sm" className="h-7 text-xs"
                      onClick={() => { onDelete(b); setConfirmId(null); }}>
                      Ya
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs"
                      onClick={() => setConfirmId(null)}>
                      Batal
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(b)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmId(b.id)}>
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

export function BranchTable({ branches, isLoading, onEdit, onDelete }: Props) {
  if (isLoading) return <LoadingState />;
  if (branches.length === 0) return <EmptyState />;
  return (
    <>
      <MobileCardList branches={branches} onEdit={onEdit} onDelete={onDelete} />
      <DesktopTable   branches={branches} onEdit={onEdit} onDelete={onDelete} />
    </>
  );
}
