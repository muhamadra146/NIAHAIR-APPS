import { useState } from "react";
import { Archive, Lock, Unlock, ChevronDown, AlertTriangle, Loader2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useInventoryPeriods, useClosePeriod, useReopenPeriod } from "../hooks";
import type { InventoryPeriod } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function monthLabel(year: number, month: number) {
  return `${MONTHS_ID[month - 1]} ${year}`;
}

/** Generate the last N months as {year, month} including the current month */
function lastNMonths(n: number): { year: number; month: number }[] {
  const result: { year: number; month: number }[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return result;
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open:      boolean;
  action:    "close" | "reopen";
  period:    { year: number; month: number } | null;
  isPending: boolean;
  onConfirm: () => void;
  onCancel:  () => void;
}

function ConfirmDialog({ open, action, period, isPending, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!period) return null;
  const label = monthLabel(period.year, period.month);
  const isClose = action === "close";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isClose
              ? <Lock className="h-5 w-5 text-destructive" />
              : <Unlock className="h-5 w-5 text-amber-600" />}
            {isClose ? "Tutup Periode" : "Buka Kembali Periode"}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          {isClose ? (
            <>
              <p className="text-sm">
                Anda akan menutup periode <strong>{label}</strong>. Semua mutasi stok bulan ini akan dikunci.
              </p>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">
                  Setelah ditutup, tidak ada mutasi stok baru yang bisa dibuat untuk bulan ini.
                  Hanya SUPER_ADMIN yang bisa membuka kembali.
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm">
              Anda akan membuka kembali periode <strong>{label}</strong>. Semua mutasi stok yang terkunci
              akan di-unlock dan bisa dimodifikasi lagi.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>Batal</Button>
          <Button
            size="sm"
            variant={isClose ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {isClose ? "Tutup Periode" : "Buka Kembali"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function StockOpnamePage() {
  const { data: dbPeriods = [], isLoading, isError, refetch } = useInventoryPeriods();
  const closeMut  = useClosePeriod();
  const reopenMut = useReopenPeriod();

  const [confirm, setConfirm] = useState<{
    action: "close" | "reopen";
    year:   number;
    month:  number;
  } | null>(null);

  // Build map from DB data
  const periodMap = new Map<string, InventoryPeriod>(
    dbPeriods.map((p) => [`${p.year}-${p.month}`, p]),
  );

  // Show last 12 months
  const months = lastNMonths(12);

  const handleConfirm = async () => {
    if (!confirm) return;
    if (confirm.action === "close") {
      await closeMut.mutateAsync({ year: confirm.year, month: confirm.month });
    } else {
      await reopenMut.mutateAsync({ year: confirm.year, month: confirm.month });
    }
    setConfirm(null);
  };

  const isPending = closeMut.isPending || reopenMut.isPending;

  return (
    <PageContainer
      title="Stock Opname"
      subtitle="Kelola periode inventory — tutup periode untuk mengunci mutasi stok"
    >
      <div className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            {
              label: "Periode Terbuka",
              value: months.filter((m) => {
                const p = periodMap.get(`${m.year}-${m.month}`);
                return !p || p.status === "OPEN";
              }).length,
              color: "text-emerald-600",
            },
            {
              label: "Periode Tertutup",
              value: months.filter((m) => {
                const p = periodMap.get(`${m.year}-${m.month}`);
                return p?.status === "CLOSED";
              }).length,
              color: "text-red-500",
            },
            {
              label: "Total Bulan Ditampilkan",
              value: months.length,
              color: "text-muted-foreground",
            },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-2xl font-bold leading-tight mt-1 ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Periods table */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Archive className="h-4 w-4" /> Daftar Periode (12 Bulan Terakhir)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : isError ? (
              <div className="py-10 text-center">
                <p className="text-sm text-destructive">Gagal memuat data periode</p>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => refetch()}>
                  Coba lagi
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Periode</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ditutup Pada</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {months.map(({ year, month }) => {
                      const key    = `${year}-${month}`;
                      const period = periodMap.get(key);
                      const status = period?.status ?? "OPEN";
                      const isCurrent =
                        year === new Date().getFullYear() &&
                        month === new Date().getMonth() + 1;

                      return (
                        <tr key={key} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-medium">{monthLabel(year, month)}</span>
                            {isCurrent && (
                              <span className="ml-2 text-xs text-primary font-medium">• Bulan ini</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={status === "OPEN" ? "default" : "destructive"}
                              className={status === "OPEN"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : ""}
                            >
                              {status === "OPEN"
                                ? <><Unlock className="h-3 w-3 mr-1 inline" />Terbuka</>
                                : <><Lock className="h-3 w-3 mr-1 inline" />Tertutup</>}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {period?.closedAt
                              ? new Date(period.closedAt).toLocaleString("id-ID", {
                                  day: "2-digit", month: "short", year: "numeric",
                                  hour: "2-digit", minute: "2-digit",
                                })
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {status === "OPEN" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/5"
                                onClick={() => setConfirm({ action: "close", year, month })}
                                disabled={isPending}
                              >
                                <Lock className="h-3 w-3" /> Tutup
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 h-7 text-xs"
                                onClick={() => setConfirm({ action: "reopen", year, month })}
                                disabled={isPending}
                              >
                                <Unlock className="h-3 w-3" /> Buka Kembali
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info box */}
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-start gap-2">
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 rotate-180" />
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p><strong>Periode Terbuka</strong> — mutasi stok (pembelian, penyesuaian, transfer) bisa dibuat.</p>
            <p><strong>Periode Tertutup</strong> — semua mutasi bulan tersebut dikunci. Tidak ada transaksi baru.</p>
            <p>Hanya <strong>SUPER_ADMIN</strong> yang bisa menutup dan membuka kembali periode.</p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        action={confirm?.action ?? "close"}
        period={confirm}
        isPending={isPending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </PageContainer>
  );
}
