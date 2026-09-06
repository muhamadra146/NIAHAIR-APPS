import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Factory, Loader2, RefreshCw, CheckCircle2, Clock,
  Wrench, FlaskConical, XCircle, ChevronRight,
} from "lucide-react";
import { PageContainer }     from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button }            from "@/components/ui/button";
import { Badge }             from "@/components/ui/badge";
import { SimpleSelect } from "@/components/ui/simple-select";
import { useProductionOrders, useProductionStats } from "../hooks";
import type { ProductionOrder, ProductionStatus } from "../types";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ProductionStatus, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
  Icon: React.ElementType;
}> = {
  DRAFT:       { label: "Draft",       variant: "secondary",    className: "",                                             Icon: Clock        },
  RELEASED:    { label: "Released",    variant: "outline",      className: "border-blue-300 text-blue-700",                Icon: ChevronRight  },
  IN_PROGRESS: { label: "Berjalan",    variant: "default",      className: "bg-amber-100 text-amber-800 border-amber-200", Icon: Wrench        },
  QC:          { label: "QC",          variant: "default",      className: "bg-purple-100 text-purple-800 border-purple-200", Icon: FlaskConical },
  COMPLETED:   { label: "Selesai",     variant: "default",      className: "bg-emerald-100 text-emerald-800 border-emerald-200", Icon: CheckCircle2 },
  CANCELLED:   { label: "Dibatalkan",  variant: "destructive",  className: "",                                             Icon: XCircle       },
};

function StatusBadge({ status }: { status: ProductionStatus }) {
  const { label, variant, className, Icon } = STATUS_CONFIG[status];
  return (
    <Badge variant={variant} className={`gap-1 ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ProductionListPage() {
  const navigate = useNavigate();

  const [filterStatus, setFilterStatus] = useState<ProductionStatus | "">("");
  const { data, isLoading, isError, refetch } = useProductionOrders({
    limit: 50,
    status: filterStatus || undefined,
  });
  const { data: stats } = useProductionStats();

  const orders = data?.data ?? [];

  return (
    <PageContainer
      title="Production"
      subtitle="Kelola production order — bahan baku menjadi finished goods"
      actions={
        <Button size="sm" className="gap-2" onClick={() => navigate("/production/new")}>
          <Plus className="h-4 w-4" /> Buat Production Order
        </Button>
      }
    >
      <div className="space-y-4">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total"      value={stats.total}                      color="text-foreground" />
            <StatCard label="Berjalan"   value={stats.byStatus.IN_PROGRESS ?? 0} color="text-amber-600"  />
            <StatCard label="QC"         value={stats.byStatus.QC ?? 0}          color="text-purple-600" />
            <StatCard label="Selesai"    value={stats.byStatus.COMPLETED ?? 0}   color="text-emerald-600" />
          </div>
        )}

        {/* Filter + count */}
        <div className="flex flex-wrap items-center gap-3">
          <SimpleSelect
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as ProductionStatus | "")}
            placeholder="Semua status"
            className="w-40 h-8 text-sm"
            options={(Object.keys(STATUS_CONFIG) as ProductionStatus[]).map((s) => ({
              value: s,
              label: STATUS_CONFIG[s].label,
            }))}
          />
          {!isLoading && (
            <p className="text-sm text-muted-foreground ml-auto">
              {orders.length} production order
            </p>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
            <p className="text-sm font-medium text-destructive">Gagal memuat data</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Coba lagi
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
            <Factory className="h-10 w-10 opacity-20" />
            <p className="text-sm">
              {filterStatus ? "Tidak ada production order dengan status ini." : "Belum ada production order."}
            </p>
            <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={() => navigate("/production/new")}>
              <Plus className="h-4 w-4" /> Buat Sekarang
            </Button>
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">No. Produksi</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tanggal</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gudang</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((o) => (
                    <ProductionRow key={o.id} order={o} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}

function ProductionRow({ order: o }: { order: ProductionOrder }) {
  const navigate = useNavigate();
  return (
    <tr
      className="hover:bg-muted/20 transition-colors cursor-pointer"
      onClick={() => navigate(`/production/${o.id}`)}
    >
      <td className="px-4 py-3">
        <p className="font-mono font-semibold text-sm">{o.productionNo}</p>
        {o.branch && <p className="text-xs text-muted-foreground">{o.branch.name}</p>}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {new Date(o.productionDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{o.warehouse?.name ?? "—"}</td>
      <td className="px-4 py-3 text-center">
        <span className="text-sm font-medium">{o._count?.items ?? o.items?.length ?? 0}</span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={o.status} />
      </td>
      <td className="px-4 py-3 text-right">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </td>
    </tr>
  );
}
