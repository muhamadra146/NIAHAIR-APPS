import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CashAccount } from "../../types";

interface Props {
  accounts:  CashAccount[];
  isLoading: boolean;
  onEdit:    (a: CashAccount) => void;
  onDelete:  (a: CashAccount) => void;
}

function LoadingState() {
  return <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
}
function EmptyState() {
  return <div className="py-12 text-center text-sm text-muted-foreground">Belum ada cash account.</div>;
}

function UsedBadge({ methods }: { methods?: { id: string; name: string }[] }) {
  if (!methods || methods.length === 0) return null;
  return (
    <span
      title={`Dipakai: ${methods.map((m) => m.name).join(", ")}`}
      className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 cursor-help"
    >
      Dipakai
    </span>
  );
}

function MobileCardList({ accounts, onEdit, onDelete }: { accounts: CashAccount[]; onEdit: (a: CashAccount) => void; onDelete: (a: CashAccount) => void }) {
  return (
    <div className="divide-y divide-border md:hidden">
      {accounts.map((a) => {
        const isUsed = (a.paymentMethods?.length ?? 0) > 0;
        return (
          <div key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="font-medium text-sm">{a.name}</p>
                <UsedBadge methods={a.paymentMethods} />
              </div>
              <p className="text-xs text-muted-foreground font-mono">{a.code}</p>
              {a.accurateAccountNo && (
                <p className="text-xs text-muted-foreground">Accurate: {a.accurateAccountNo}</p>
              )}
              <Badge variant={a.isActive ? "success" : "secondary"} className="mt-1 text-xs">
                {a.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost" size="icon"
                onClick={() => onDelete(a)}
                disabled={isUsed}
                title={isUsed ? `Tidak dapat dihapus — dipakai oleh: ${a.paymentMethods?.map((m) => m.name).join(", ")}` : "Hapus permanen"}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onEdit(a)}><Pencil className="h-4 w-4" /></Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DesktopTable({ accounts, onEdit, onDelete }: { accounts: CashAccount[]; onEdit: (a: CashAccount) => void; onDelete: (a: CashAccount) => void }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nama</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Accurate Account No</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => {
            const isUsed = (a.paymentMethods?.length ?? 0) > 0;
            return (
              <tr key={a.id} className="border-b border-border transition-colors hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{a.code}</td>
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center">
                    {a.name}
                    <UsedBadge methods={a.paymentMethods} />
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{a.accurateAccountNo ?? "—"}</td>
                <td className="px-4 py-3"><Badge variant={a.isActive ? "success" : "secondary"}>{a.isActive ? "Active" : "Inactive"}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => onDelete(a)}
                      disabled={isUsed}
                      title={isUsed ? `Tidak dapat dihapus — dipakai oleh: ${a.paymentMethods?.map((m) => m.name).join(", ")}` : "Hapus permanen"}
                    >
                      <Trash2 className={`h-4 w-4 ${isUsed ? "text-muted-foreground" : "text-destructive"}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(a)}><Pencil className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CashAccountTable({ accounts, isLoading, onEdit, onDelete }: Props) {
  if (isLoading) return <LoadingState />;
  if (accounts.length === 0) return <EmptyState />;
  return (
    <>
      <MobileCardList accounts={accounts} onEdit={onEdit} onDelete={onDelete} />
      <DesktopTable   accounts={accounts} onEdit={onEdit} onDelete={onDelete} />
    </>
  );
}
