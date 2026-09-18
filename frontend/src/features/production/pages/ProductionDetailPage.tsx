import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, ChevronRight, Lock, Unlock, FlaskConical,
  Package, Wrench, Users, Clock, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, Link2,
} from "lucide-react";
import { PageContainer }     from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button }            from "@/components/ui/button";
import { Badge }             from "@/components/ui/badge";
import { Label }             from "@/components/ui/label";
import { Textarea }          from "@/components/ui/textarea";
import { SimpleSelect } from "@/components/ui/simple-select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

// ── ConfirmDialog helper ───────────────────────────────────────────────────────
function ConfirmDialog({
  open, title, description, confirmLabel = "Ya, lanjutkan", loading = false,
  onConfirm, onCancel,
}: {
  open: boolean; title: string; description: React.ReactNode;
  confirmLabel?: string; loading?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={loading}>Batal</Button>
          <Button
            onClick={onConfirm} disabled={loading}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useProductionOrder, useUpdateProductionStatus, useSubmitProductionQC, useDeleteProductionOrder, useSyncProductionToAccurate } from "../hooks";
import type { ProductionStatus, ProductionQCStatus } from "../types";

// ── Status colours ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<ProductionStatus, string> = {
  DRAFT: "Draft", RELEASED: "Released", IN_PROGRESS: "Berjalan",
  QC: "QC", COMPLETED: "Selesai", CANCELLED: "Dibatalkan",
};

const STATUS_CLASS: Record<ProductionStatus, string> = {
  DRAFT:       "bg-muted text-muted-foreground",
  RELEASED:    "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  QC:          "bg-purple-100 text-purple-800",
  COMPLETED:   "bg-emerald-100 text-emerald-800",
  CANCELLED:   "bg-destructive/10 text-destructive",
};

// QC tidak punya next-status di sini — transisi ke COMPLETED dilakukan
// otomatis via QC dialog (Submit QC → PASS). Tombol "Selesaikan" dihapus
// karena selalu gagal tanpa QC PASS terlebih dahulu.
const NEXT_STATUS: Partial<Record<ProductionStatus, { label: string; status: ProductionStatus; variant?: "destructive" | "default" | "outline" }[]>> = {
  DRAFT:       [{ label: "Release",         status: "RELEASED",    variant: "default"     },
                { label: "Batalkan",        status: "CANCELLED",   variant: "destructive" }],
  RELEASED:    [{ label: "Mulai Produksi",  status: "IN_PROGRESS", variant: "default"     },
                { label: "Batalkan",        status: "CANCELLED",   variant: "destructive" }],
  IN_PROGRESS: [{ label: "Kirim ke QC",    status: "QC",          variant: "default"     },
                { label: "Batalkan",        status: "CANCELLED",   variant: "destructive" }],
  // QC: lihat render khusus di bawah — tombol "Submit QC" + "Batalkan" tanpa "Selesaikan"
  // Transisi QC → COMPLETED ditangani otomatis saat Submit QC dengan hasil PASS.
};

// ── QC Dialog ─────────────────────────────────────────────────────────────────

function QCDialog({
  open, orderId, onClose,
}: { open: boolean; orderId: string; onClose: () => void }) {
  const submitQC = useSubmitProductionQC();
  const [status, setStatus]   = useState<ProductionQCStatus>("PASS");
  const [notes, setNotes]     = useState("");

  const handleSubmit = async () => {
    await submitQC.mutateAsync({ id: orderId, input: { status, notes: notes || undefined } });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-600" /> Submit QC Result
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Status QC</Label>
            <SimpleSelect
              value={status}
              onChange={(v) => setStatus(v as ProductionQCStatus)}
              options={[
                { value: "PASS",   label: "✅ PASS — Lanjut ke Completed" },
                { value: "REWORK", label: "🔄 REWORK — Kembali ke In Progress" },
                { value: "REJECT", label: "❌ REJECT — Barang ditolak" },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qc-notes">Catatan QC</Label>
            <Textarea
              id="qc-notes"
              rows={3}
              placeholder="Keterangan hasil inspeksi..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitQC.isPending}>Batal</Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitQC.isPending}>
            {submitQC.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Submit QC
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ProductionDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate     = useNavigate();

  const { data: order, isLoading, isError } = useProductionOrder(id);
  const updateStatus = useUpdateProductionStatus();
  const deleteMut    = useDeleteProductionOrder();
  const syncMut      = useSyncProductionToAccurate();

  const [qcOpen, setQcOpen]         = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [transitioning, setTransitioning] = useState<ProductionStatus | null>(null);

  const handleTransition = async (newStatus: ProductionStatus) => {
    // QC submit opens a dialog
    if (newStatus === "QC" && order?.status === "IN_PROGRESS") {
      // This goes to QC status, not submitting QC result — different flow
    }
    setTransitioning(newStatus);
    try {
      await updateStatus.mutateAsync({ id, input: { status: newStatus } });
    } finally {
      setTransitioning(null);
    }
  };

  const handleDelete = async () => {
    await deleteMut.mutateAsync(id);
    navigate("/production");
  };

  if (isLoading) {
    return (
      <PageContainer title="Production Order">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !order) {
    return (
      <PageContainer title="Production Order">
        <div className="py-16 text-center">
          <p className="text-destructive text-sm">Production order tidak ditemukan</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => navigate("/production")}>
            Kembali
          </Button>
        </div>
      </PageContainer>
    );
  }

  const nextStatuses = NEXT_STATUS[order.status] ?? [];
  const lastQC = order.qcRecords?.[0];

  return (
    <PageContainer
      title={order.productionNo}
      subtitle={`${order.branch?.name} • ${new Date(order.productionDate).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`}
    >
      {/* Back */}
      <Button variant="ghost" size="sm" className="mb-4 -ml-2 gap-1.5" onClick={() => navigate("/production")}>
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Button>

      <div className="space-y-4">
        {/* Status + actions */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${STATUS_CLASS[order.status]}`}>
                  {STATUS_LABEL[order.status]}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* QC submit button — shown when status = QC */}
                {order.status === "QC" && (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5 bg-purple-600 hover:bg-purple-700"
                      onClick={() => setQcOpen(true)}
                    >
                      <FlaskConical className="h-4 w-4" /> Submit QC
                    </Button>
                    {/* Operator bisa batalkan dari QC jika diperlukan */}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleTransition("CANCELLED")}
                      disabled={updateStatus.isPending}
                    >
                      {transitioning === "CANCELLED" && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                      Batalkan
                    </Button>
                  </>
                )}
                {nextStatuses.map((ns) => (
                  <Button
                    key={ns.status}
                    size="sm"
                    variant={ns.variant ?? "default"}
                    onClick={() => handleTransition(ns.status)}
                    disabled={updateStatus.isPending}
                  >
                    {transitioning === ns.status && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                    {ns.label}
                  </Button>
                ))}
                {order.status === "DRAFT" && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteOpen(true)}>
                    Hapus
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Detail */}
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Detail</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2 text-sm">
              <Row label="Gudang"     value={order.warehouse?.name ?? "—"} />
              <Row label="Dibuat oleh" value={order.createdBy?.name ?? "—"} />
              {order.plannedStartAt  && <Row label="Rencana Mulai"  value={fmtDt(order.plannedStartAt)}  />}
              {order.plannedFinishAt && <Row label="Rencana Selesai" value={fmtDt(order.plannedFinishAt)} />}
              {order.actualStartAt   && <Row label="Mulai Aktual"   value={fmtDt(order.actualStartAt)}   />}
              {order.actualFinishAt  && <Row label="Selesai Aktual" value={fmtDt(order.actualFinishAt)}  />}
              {order.notes           && <Row label="Catatan"        value={order.notes}                  />}
            </CardContent>
          </Card>

          {/* Last QC */}
          {lastQC && (
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" /> Hasil QC Terakhir
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2 text-sm">
                <Row label="Status QC" value={
                  <Badge className={
                    lastQC.status === "PASS"   ? "bg-emerald-100 text-emerald-800" :
                    lastQC.status === "REWORK" ? "bg-amber-100 text-amber-800" :
                    "bg-destructive/10 text-destructive"
                  }>{lastQC.status}</Badge>
                } />
                <Row label="Inspektor" value={lastQC.qcEmployee?.name ?? "—"} />
                <Row label="Tanggal"   value={fmtDt(lastQC.inspectionDate)} />
                {lastQC.notes && <Row label="Catatan" value={lastQC.notes} />}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Accurate sync card — hanya tampil saat COMPLETED */}
        {order.status === "COMPLETED" && (
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Link2 className="h-4 w-4" /> Accurate Online
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3 text-sm">
              {/* Pekerjaan Pesanan (Job Order / JC) */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Pekerjaan Pesanan</span>
                {order.accuratePekerjaanNumber ? (
                  <span className="font-mono text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                    {order.accuratePekerjaanNumber}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Belum tersync</span>
                )}
              </div>
              {/* Penyelesaian Pesanan (Item Adjustment IN) */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Penyelesaian Pesanan</span>
                {order.accuratePenyelesaianNumber ? (
                  <span className="font-mono text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                    {order.accuratePenyelesaianNumber}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Belum tersync</span>
                )}
              </div>
              {/* Last sync time */}
              {order.lastSyncAt && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Terakhir Sync</span>
                  <span className="text-xs text-muted-foreground">{fmtDt(order.lastSyncAt)}</span>
                </div>
              )}
              {/* Manual sync button */}
              <div className="pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 w-full"
                  onClick={() => syncMut.mutate(id)}
                  disabled={syncMut.isPending}
                >
                  {syncMut.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <RefreshCw className="h-4 w-4" />}
                  {order.accuratePekerjaanId ? "Sync Ulang ke Accurate" : "Sync ke Accurate"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Finished goods items */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" /> Finished Goods ({order.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Item</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Planned Qty</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Produced Qty</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Inventory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/10">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{item.item.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.item.itemCode}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{item.plannedQuantity} {item.unit.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{item.producedQuantity} {item.unit.name}</td>
                    <td className="px-4 py-2.5 text-center">
                      {item.inventoryMovementId
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                        : <Clock className="h-4 w-4 text-muted-foreground mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Raw materials */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Raw Materials ({order.materials.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Material</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Gudang</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Planned</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Actual</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Moved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.materials.map((mat) => (
                  <tr key={mat.id} className="hover:bg-muted/10">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{mat.item.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{mat.item.itemCode}</p>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{mat.warehouse.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{mat.plannedQuantity} {mat.unit.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{mat.actualQuantity} {mat.unit.name}</td>
                    <td className="px-4 py-2.5 text-center">
                      {mat.inventoryMovementId
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                        : <Clock className="h-4 w-4 text-muted-foreground mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Timeline */}
        {order.timelines.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" /> Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-4">
              <ol className="relative border-l border-border ml-2 space-y-4">
                {order.timelines.map((tl) => (
                  <li key={tl.id} className="ml-4 pl-2">
                    <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border border-background bg-border" />
                    <p className="text-xs text-muted-foreground">
                      {new Date(tl.createdAt).toLocaleString("id-ID", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                      {tl.createdBy && ` • ${tl.createdBy.name}`}
                    </p>
                    <p className="text-sm font-medium mt-0.5">{tl.description ?? tl.timelineType}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Employees */}
        {order.employees.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Staff Produksi
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <div className="flex flex-wrap gap-2">
                {order.employees.map((e) => (
                  <Badge key={e.id} variant="secondary" className="gap-1">
                    {e.employee.name} <span className="text-muted-foreground">({e.role})</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* QC Dialog */}
      <QCDialog open={qcOpen} orderId={id} onClose={() => setQcOpen(false)} />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteOpen}
        title="Hapus Production Order?"
        description={<><strong>{order.productionNo}</strong> akan dihapus permanen. Aksi ini tidak bisa dibatalkan.</>}
        confirmLabel="Hapus"
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </PageContainer>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function fmtDt(s: string) {
  return new Date(s).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
