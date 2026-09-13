import { useState, useEffect, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Check, CheckCircle, Loader2, Printer,
  RefreshCw, RotateCcw, Send, Trash2, TruckIcon, XCircle,
} from "lucide-react";
import { useAuthStore }       from "@/stores/authStore";
import { PageContainer }      from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button }             from "@/components/ui/button";
import { Badge }              from "@/components/ui/badge";
import { Label }              from "@/components/ui/label";
import { Input }              from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast }  from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import {
  useStockTransfer,
  useUpdateTransferStatus,
  useDeleteStockTransfer,
  useUndoTransferReceive,
  useSyncStockTransferToAccurate,
} from "../hooks";
import type { StockTransfer, StockTransferStatus } from "../types";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<StockTransferStatus, string> = {
  PENDING:    "Pending",
  IN_TRANSIT: "Dikirim",
  RECEIVED:   "Diterima",
  CANCELLED:  "Dibatalkan",
};

const STATUS_VARIANT: Record<StockTransferStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING:    "secondary",
  IN_TRANSIT: "outline",
  RECEIVED:   "default",
  CANCELLED:  "destructive",
};

// ── Status Timeline ───────────────────────────────────────────────────────────

function StatusTimeline({ status, createdAt }: { status: StockTransferStatus; createdAt: string }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
        <XCircle className="h-4 w-4" />
        Transfer ini telah dibatalkan
      </div>
    );
  }

  const ORDER: Record<string, number> = { PENDING: 0, IN_TRANSIT: 1, RECEIVED: 2 };
  const currentIdx = ORDER[status] ?? 0;

  const steps = [
    { key: "PENDING",    label: "Pending",           desc: "Transfer dibuat" },
    { key: "IN_TRANSIT", label: "Dikirim",            desc: "Barang dalam perjalanan" },
    { key: "RECEIVED",   label: "Diterima",           desc: "Barang sudah diterima" },
  ];

  return (
    <div className="flex items-center w-full">
      {steps.map((step, i) => {
        const isDone   = i < currentIdx;
        const isActive = i === currentIdx;
        return (
          <Fragment key={step.key}>
            <div className="flex flex-col items-center min-w-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                isDone
                  ? "bg-primary text-primary-foreground"
                  : isActive
                    ? "bg-primary/15 border-2 border-primary text-primary"
                    : "bg-muted text-muted-foreground"
              }`}>
                {isDone ? <Check className="h-4 w-4" /> : <span>{i + 1}</span>}
              </div>
              <p className={`text-xs mt-1.5 font-medium text-center ${
                isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
              }`}>
                {step.label}
              </p>
              <p className={`text-xs text-center hidden sm:block ${
                isActive ? "text-muted-foreground" : "text-muted-foreground/60"
              }`}>
                {i === 0 ? formatDate(createdAt) : step.desc}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 mb-5 transition-colors ${
                i < currentIdx ? "bg-primary" : "bg-muted"
              }`} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  open, title, description, confirmLabel, danger = false, isPending, onConfirm, onCancel,
}: {
  open:         boolean;
  title:        string;
  description:  string;
  confirmLabel: string;
  danger?:      boolean;
  isPending:    boolean;
  onConfirm:    () => void;
  onCancel:     () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>Batal</Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            variant={danger ? "destructive" : "default"}
            className="gap-1.5">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Receive Dialog ────────────────────────────────────────────────────────────

function ReceiveDialog({
  transfer, branchId, onClose,
}: {
  transfer: StockTransfer;
  branchId?: string | null;
  onClose:   () => void;
}) {
  const inventoryItems = transfer.items.filter((it) => it.item.itemType === "INVENTORY");
  const [qtys, setQtys] = useState<Record<string, string>>(() =>
    Object.fromEntries(inventoryItems.map((it) => [it.itemId, String(Number(it.qty))]))
  );
  const updateStatusMut = useUpdateTransferStatus();

  function handleSubmit() {
    for (const it of inventoryItems) {
      const val = Number(qtys[it.itemId]);
      if (isNaN(val) || val < 0)    return toast.error(`Qty tidak valid untuk ${it.item.name}`);
      if (val > Number(it.qty))     return toast.error(`Qty terima tidak boleh melebihi qty kirim (${it.item.name})`);
    }
    const receivedItems = inventoryItems.map((it) => ({
      itemId:      it.itemId,
      receivedQty: Number(qtys[it.itemId]),
    }));
    updateStatusMut.mutate(
      { id: transfer.id, status: "RECEIVED", branchId, receivedItems },
      {
        onSuccess: () => { toast.success("Barang berhasil diterima"); onClose(); },
        onError:   (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Terima Barang — {transfer.transferNo}</DialogTitle>
        </DialogHeader>
        <div className="text-xs text-muted-foreground mb-3">
          Dari: <span className="font-medium">{transfer.sourceWarehouse.name}</span>
          {" → "}
          Ke: <span className="font-medium">{transfer.destinationWarehouse.name}</span>
        </div>
        <div className="space-y-3">
          {inventoryItems.map((it) => {
            const sentQty = Number(it.qty);
            const val     = qtys[it.itemId] ?? String(sentQty);
            const num     = Number(val);
            const isShort = !isNaN(num) && num < sentQty;
            return (
              <div key={it.itemId} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{it.item.name}</Label>
                  <span className="text-xs text-muted-foreground">Dikirim: {sentQty}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min={0} max={sentQty} step="any"
                    value={val}
                    onChange={(e) => setQtys((prev) => ({ ...prev, [it.itemId]: e.target.value }))}
                    className="h-8 text-sm"
                  />
                  {isShort && (
                    <span className="text-xs text-amber-600 whitespace-nowrap">
                      -{sentQty - num} kurang
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={updateStatusMut.isPending}>Batal</Button>
          <Button onClick={handleSubmit} disabled={updateStatusMut.isPending} className="bg-green-600 hover:bg-green-700 gap-1.5">
            {updateStatusMut.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Check className="h-4 w-4" />}
            Konfirmasi Terima
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Print: Surat Jalan ────────────────────────────────────────────────────────

function PrintSuratJalan({ transfer }: { transfer: StockTransfer }) {
  const printDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
  const transferDate = new Date(transfer.transferDate).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
  const isReceived = transfer.status === "RECEIVED";

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", color: "#000", padding: "0", margin: "0" }}>
      {/* Kop surat */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #000", paddingBottom: "12px", marginBottom: "16px" }}>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: "18px", fontWeight: "bold", letterSpacing: "0.5px" }}>NIAHAIR</p>
          <p style={{ margin: "0", fontSize: "11px", color: "#555" }}>Extension & Coloring</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: "0 0 2px", fontSize: "16px", fontWeight: "bold" }}>SURAT JALAN</p>
          <p style={{ margin: "0", fontSize: "11px", color: "#555" }}>No: <strong>{transfer.transferNo}</strong></p>
        </div>
      </div>

      {/* Info transfer */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "12px" }}>
        <tbody>
          <tr>
            <td style={{ padding: "2px 8px 2px 0", width: "20%", color: "#555" }}>Tanggal</td>
            <td style={{ padding: "2px 0", width: "30%" }}>: <strong>{transferDate}</strong></td>
            <td style={{ padding: "2px 8px 2px 0", width: "20%", color: "#555" }}>Status</td>
            <td style={{ padding: "2px 0" }}>: <strong>{STATUS_LABEL[transfer.status]}</strong></td>
          </tr>
          <tr>
            <td style={{ padding: "2px 8px 2px 0", color: "#555" }}>Dari</td>
            <td style={{ padding: "2px 0" }}>
              : {transfer.sourceWarehouse.name}
              {transfer.sourceWarehouse.branch ? ` (${transfer.sourceWarehouse.branch.name})` : ""}
            </td>
            <td style={{ padding: "2px 8px 2px 0", color: "#555" }}>Ke</td>
            <td style={{ padding: "2px 0" }}>
              : {transfer.destinationWarehouse.name}
              {transfer.destinationWarehouse.branch ? ` (${transfer.destinationWarehouse.branch.name})` : ""}
            </td>
          </tr>
          {transfer.notes && (
            <tr>
              <td style={{ padding: "2px 8px 2px 0", color: "#555", verticalAlign: "top" }}>Catatan</td>
              <td colSpan={3} style={{ padding: "2px 0" }}>: {transfer.notes}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Tabel item */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "32px" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th style={{ border: "1px solid #bbb", padding: "6px 8px", textAlign: "center", width: "36px" }}>No</th>
            <th style={{ border: "1px solid #bbb", padding: "6px 8px", textAlign: "left" }}>Nama Barang</th>
            <th style={{ border: "1px solid #bbb", padding: "6px 8px", textAlign: "left", width: "100px" }}>Kode</th>
            <th style={{ border: "1px solid #bbb", padding: "6px 8px", textAlign: "right", width: "80px" }}>Qty Kirim</th>
            {isReceived && (
              <th style={{ border: "1px solid #bbb", padding: "6px 8px", textAlign: "right", width: "90px" }}>Qty Terima</th>
            )}
            <th style={{ border: "1px solid #bbb", padding: "6px 8px", textAlign: "left", width: "120px" }}>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {transfer.items.map((item, i) => {
            const sentQty     = Number(item.qty);
            const receivedQty = item.receivedQty != null ? Number(item.receivedQty) : null;
            const diff        = receivedQty != null ? receivedQty - sentQty : null;
            return (
              <tr key={item.id} style={{ background: i % 2 === 1 ? "#fafafa" : "#fff" }}>
                <td style={{ border: "1px solid #bbb", padding: "5px 8px", textAlign: "center" }}>{i + 1}</td>
                <td style={{ border: "1px solid #bbb", padding: "5px 8px" }}>{item.item.name}</td>
                <td style={{ border: "1px solid #bbb", padding: "5px 8px", fontFamily: "monospace", fontSize: "11px" }}>{item.item.itemCode ?? "-"}</td>
                <td style={{ border: "1px solid #bbb", padding: "5px 8px", textAlign: "right" }}>
                  {sentQty.toLocaleString("id-ID")}
                </td>
                {isReceived && (
                  <td style={{ border: "1px solid #bbb", padding: "5px 8px", textAlign: "right" }}>
                    {receivedQty != null ? (
                      <span style={{ color: diff !== null && diff < 0 ? "#c00" : "inherit" }}>
                        {receivedQty.toLocaleString("id-ID")}
                        {diff !== null && diff !== 0 && ` (${diff > 0 ? "+" : ""}${diff})`}
                      </span>
                    ) : "-"}
                  </td>
                )}
                <td style={{ border: "1px solid #bbb", padding: "5px 8px" }}></td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: "#f5f5f5", fontWeight: "bold" }}>
            <td colSpan={isReceived ? 3 : 3} style={{ border: "1px solid #bbb", padding: "5px 8px", textAlign: "right" }}>Total Item</td>
            <td style={{ border: "1px solid #bbb", padding: "5px 8px", textAlign: "right" }}>
              {transfer.items.reduce((s, it) => s + Number(it.qty), 0).toLocaleString("id-ID")}
            </td>
            {isReceived && (
              <td style={{ border: "1px solid #bbb", padding: "5px 8px", textAlign: "right" }}>
                {transfer.items.reduce((s, it) => s + (it.receivedQty != null ? Number(it.receivedQty) : 0), 0).toLocaleString("id-ID")}
              </td>
            )}
            <td style={{ border: "1px solid #bbb", padding: "5px 8px" }}></td>
          </tr>
        </tfoot>
      </table>

      {/* Tanda tangan */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontWeight: "bold", margin: "0 0 64px" }}>Pengirim</p>
          <div style={{ borderTop: "1px solid #000", paddingTop: "4px" }}>
            <p style={{ margin: "0", fontSize: "11px" }}>{transfer.sourceWarehouse.name}</p>
            <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#777" }}>Nama & Tanda Tangan</p>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontWeight: "bold", margin: "0 0 64px" }}>Penerima</p>
          <div style={{ borderTop: "1px solid #000", paddingTop: "4px" }}>
            <p style={{ margin: "0", fontSize: "11px" }}>{transfer.destinationWarehouse.name}</p>
            <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#777" }}>Nama & Tanda Tangan</p>
          </div>
        </div>
      </div>

      {/* Footer cetak */}
      <div style={{ borderTop: "1px solid #ddd", marginTop: "24px", paddingTop: "8px", textAlign: "center", fontSize: "10px", color: "#888" }}>
        Dicetak pada {printDate} · NIAHAIR ERP
      </div>
    </div>
  );
}

// ── Main Detail Page ──────────────────────────────────────────────────────────

export function StockTransferDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: transfer, isLoading, isError, refetch } = useStockTransfer(id);
  const updateStatusMut = useUpdateTransferStatus();
  const deleteMut       = useDeleteStockTransfer();
  const undoReceiveMut  = useUndoTransferReceive();
  const syncMut         = useSyncStockTransferToAccurate();
  const { branchId, user } = useAuthStore();

  const isSuperUser = user?.roleCode === "SUPER_ADMIN" || user?.roleCode === "OWNER";

  // Inject print styles (show only print area when printing)
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-for", "transfer-detail-print");
    style.textContent = `
      @media print {
        body > * { visibility: hidden !important; }
        #transfer-print-area {
          visibility: visible !important;
          position: fixed !important;
          top: 0 !important; left: 0 !important;
          width: 100% !important;
          background: white !important;
          padding: 0 !important;
          z-index: 99999 !important;
        }
        #transfer-print-area * { visibility: visible !important; }
        @page { margin: 1.5cm; size: A4 portrait; }
      }
    `;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  // Dialog states
  const [kirimOpen,   setKirimOpen]   = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [deleteOpen,  setDeleteOpen]  = useState(false);
  const [undoOpen,    setUndoOpen]    = useState(false);

  // ── Loading / Error states ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <PageContainer>
        <div className="py-16 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat data transfer...
        </div>
      </PageContainer>
    );
  }
  if (isError || !transfer) {
    return (
      <PageContainer>
        <div className="py-16 text-center space-y-2">
          <p className="text-sm text-destructive font-medium">Gagal memuat data transfer</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Coba lagi
          </Button>
        </div>
      </PageContainer>
    );
  }

  // ── Authorization helpers ───────────────────────────────────────────────
  const canKirim = () => {
    if (transfer.status !== "PENDING") return false;
    if (isSuperUser) return true;
    return !transfer.sourceWarehouse.branchId || transfer.sourceWarehouse.branchId === branchId;
  };
  const canTerima = () => {
    if (transfer.status !== "IN_TRANSIT") return false;
    if (isSuperUser) return true;
    return !transfer.destinationWarehouse.branchId || transfer.destinationWarehouse.branchId === branchId;
  };
  const canDelete = () => {
    if (transfer.status !== "PENDING" && transfer.status !== "IN_TRANSIT") return false;
    if (isSuperUser) return true;
    return !transfer.sourceWarehouse.branchId || transfer.sourceWarehouse.branchId === branchId;
  };
  const canUndoReceive = () => {
    if (transfer.status !== "RECEIVED") return false;
    if (isSuperUser) return true;
    return !transfer.destinationWarehouse.branchId || transfer.destinationWarehouse.branchId === branchId;
  };
  const canSync = () => transfer.status === "IN_TRANSIT" || transfer.status === "RECEIVED";

  // Accurate sync: perlu sync jika belum ada ID
  const needsOutSync     = !transfer.accurateTransferId && canSync();
  const needsReceiveSync = transfer.status === "RECEIVED" && transfer.accurateTransferId && !transfer.accurateReceiveId;
  const needsAnySync     = needsOutSync || needsReceiveSync;

  return (
    <PageContainer>
      {/* ── Hidden print area (visibility:hidden so @media print can reveal it) */}
      <div id="transfer-print-area" style={{ position: "fixed", top: 0, left: 0, width: "100%", visibility: "hidden", pointerEvents: "none", zIndex: -1 }}>
        <PrintSuratJalan transfer={transfer} />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mt-0.5 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold font-mono">{transfer.transferNo}</h1>
              <Badge variant={STATUS_VARIANT[transfer.status]}>
                {STATUS_LABEL[transfer.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {transfer.sourceWarehouse.name} → {transfer.destinationWarehouse.name}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print Surat Jalan</span>
          </Button>
          {canKirim() && (
            <Button size="sm" variant="outline" onClick={() => setKirimOpen(true)} className="gap-1.5" disabled={updateStatusMut.isPending}>
              <TruckIcon className="h-4 w-4" /> Kirim
            </Button>
          )}
          {canTerima() && (
            <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => setReceiveOpen(true)} disabled={updateStatusMut.isPending}>
              <Check className="h-4 w-4" /> Terima
            </Button>
          )}
          {canUndoReceive() && (
            <Button size="sm" variant="outline" onClick={() => setUndoOpen(true)}
              className="gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50"
              disabled={undoReceiveMut.isPending}>
              <RotateCcw className="h-4 w-4" /> Batal Terima
            </Button>
          )}
          {canDelete() && (
            <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}
              className="gap-1.5" disabled={deleteMut.isPending}>
              <Trash2 className="h-4 w-4" /> Hapus
            </Button>
          )}
        </div>
      </div>

      {/* ── Status Timeline ─────────────────────────────────────────────── */}
      <Card className="mb-4">
        <CardContent className="pt-5 pb-4">
          <StatusTimeline status={transfer.status} createdAt={transfer.createdAt} />
        </CardContent>
      </Card>

      {/* ── Main grid ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* ── Left: Info + Items ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Info card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informasi Transfer</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Tanggal Transfer</dt>
                  <dd className="font-medium mt-0.5">{new Date(transfer.transferDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Dibuat Pada</dt>
                  <dd className="font-medium mt-0.5">{new Date(transfer.createdAt).toLocaleString("id-ID")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Gudang Asal</dt>
                  <dd className="font-medium mt-0.5">{transfer.sourceWarehouse.name}</dd>
                  {transfer.sourceWarehouse.branch && (
                    <dd className="text-xs text-muted-foreground">{transfer.sourceWarehouse.branch.name}</dd>
                  )}
                </div>
                <div>
                  <dt className="text-muted-foreground">Gudang Tujuan</dt>
                  <dd className="font-medium mt-0.5">{transfer.destinationWarehouse.name}</dd>
                  {transfer.destinationWarehouse.branch && (
                    <dd className="text-xs text-muted-foreground">{transfer.destinationWarehouse.branch.name}</dd>
                  )}
                </div>
                {transfer.notes && (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Catatan</dt>
                    <dd className="font-medium mt-0.5">{transfer.notes}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Items table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Daftar Item</CardTitle>
                <span className="text-xs text-muted-foreground">{transfer.items.length} item</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium">Barang</th>
                      <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Kode</th>
                      <th className="text-right px-4 py-3 font-medium">Qty Kirim</th>
                      {transfer.status === "RECEIVED" && (
                        <th className="text-right px-4 py-3 font-medium">Qty Diterima</th>
                      )}
                      {transfer.status === "RECEIVED" && (
                        <th className="text-right px-4 py-3 font-medium">Selisih</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {transfer.items.map((item) => {
                      const sentQty     = Number(item.qty);
                      const receivedQty = item.receivedQty != null ? Number(item.receivedQty) : null;
                      const diff        = receivedQty != null ? receivedQty - sentQty : null;
                      return (
                        <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <p className="font-medium">{item.item.name}</p>
                            <p className="text-xs text-muted-foreground sm:hidden font-mono">{item.item.itemCode ?? ""}</p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden sm:table-cell">
                            {item.item.itemCode ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {sentQty.toLocaleString("id-ID")}
                          </td>
                          {transfer.status === "RECEIVED" && (
                            <td className="px-4 py-3 text-right font-mono">
                              {receivedQty != null ? receivedQty.toLocaleString("id-ID") : "—"}
                            </td>
                          )}
                          {transfer.status === "RECEIVED" && (
                            <td className={`px-4 py-3 text-right font-mono text-xs ${
                              diff === null ? "text-muted-foreground" :
                              diff < 0 ? "text-destructive font-semibold" :
                              diff > 0 ? "text-green-600" :
                              "text-muted-foreground"
                            }`}>
                              {diff === null ? "—" : diff === 0 ? "✓" : `${diff > 0 ? "+" : ""}${diff}`}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20 font-semibold">
                      <td className="px-4 py-2 text-xs text-muted-foreground" colSpan={transfer.status === "RECEIVED" ? 2 : 2}>
                        Total
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-sm">
                        {transfer.items.reduce((s, it) => s + Number(it.qty), 0).toLocaleString("id-ID")}
                      </td>
                      {transfer.status === "RECEIVED" && (
                        <td className="px-4 py-2 text-right font-mono text-sm">
                          {transfer.items.reduce((s, it) => s + (it.receivedQty != null ? Number(it.receivedQty) : 0), 0).toLocaleString("id-ID")}
                        </td>
                      )}
                      {transfer.status === "RECEIVED" && <td />}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right Sidebar ──────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Accurate sync card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Accurate Online</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {/* TRANSFER_OUT sync status */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Transfer Out</p>
                {transfer.accurateTransferId ? (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Tersinkron</span>
                    </div>
                    {transfer.accurateTransferNumber && (
                      <p className="text-xs text-muted-foreground font-mono pl-5.5">
                        {transfer.accurateTransferNumber}
                      </p>
                    )}
                    {transfer.lastSyncAt && (
                      <p className="text-xs text-muted-foreground pl-5.5">
                        {new Date(transfer.lastSyncAt).toLocaleString("id-ID")}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <XCircle className="h-4 w-4" />
                    <span>Belum disinkronkan</span>
                  </div>
                )}
              </div>

              {/* TRANSFER_IN sync status (only shown if RECEIVED) */}
              {transfer.status === "RECEIVED" && (
                <div className="space-y-1 pt-1 border-t">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Transfer In (Penerimaan)</p>
                  {transfer.accurateReceiveId ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Tersinkron</span>
                      </div>
                      {transfer.accurateReceiveNumber && (
                        <p className="text-xs text-muted-foreground font-mono pl-5.5">
                          {transfer.accurateReceiveNumber}
                        </p>
                      )}
                      {transfer.lastReceiveSyncAt && (
                        <p className="text-xs text-muted-foreground pl-5.5">
                          {new Date(transfer.lastReceiveSyncAt).toLocaleString("id-ID")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <XCircle className="h-4 w-4" />
                      <span>Belum disinkronkan</span>
                    </div>
                  )}
                </div>
              )}

              {/* Manual sync button */}
              {needsAnySync && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 mt-1"
                  onClick={() => {
                    syncMut.mutate(transfer.id, {
                      onSuccess: () => toast.success("Berhasil disinkronkan ke Accurate"),
                      onError:   (e: Error) => toast.error(e.message),
                    });
                  }}
                  disabled={syncMut.isPending}>
                  {syncMut.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />}
                  {needsOutSync ? "Sync Transfer Out" : "Sync Penerimaan"}
                </Button>
              )}

              {!needsAnySync && canSync() && (
                <p className="text-xs text-green-600 flex items-center gap-1.5 mt-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Semua data tersinkron
                </p>
              )}

              {!canSync() && (
                <p className="text-xs text-muted-foreground">
                  Transfer harus dikirim (IN_TRANSIT) sebelum bisa disinkronkan ke Accurate.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Summary card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Item</span>
                <span className="font-medium">{transfer.items.length} jenis</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Qty Kirim</span>
                <span className="font-mono font-medium">
                  {transfer.items.reduce((s, it) => s + Number(it.qty), 0).toLocaleString("id-ID")}
                </span>
              </div>
              {transfer.status === "RECEIVED" && (
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Total Qty Terima</span>
                  <span className="font-mono font-medium text-green-600">
                    {transfer.items.reduce((s, it) => s + (it.receivedQty != null ? Number(it.receivedQty) : 0), 0).toLocaleString("id-ID")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}

      <ConfirmDialog
        open={kirimOpen}
        title="Kirim Transfer?"
        description={`Transfer ${transfer.transferNo} akan dikirim dari ${transfer.sourceWarehouse.name}. Stok akan dikurangi dari gudang asal. Lanjutkan?`}
        confirmLabel="Ya, Kirim"
        isPending={updateStatusMut.isPending}
        onConfirm={() => {
          updateStatusMut.mutate(
            { id: transfer.id, status: "IN_TRANSIT", branchId },
            {
              onSuccess: () => { toast.success("Transfer berhasil dikirim"); setKirimOpen(false); },
              onError:   (e: Error) => { toast.error(e.message); setKirimOpen(false); },
            },
          );
        }}
        onCancel={() => setKirimOpen(false)}
      />

      {receiveOpen && (
        <ReceiveDialog
          transfer={transfer}
          branchId={branchId}
          onClose={() => setReceiveOpen(false)}
        />
      )}

      <ConfirmDialog
        open={undoOpen}
        title="Batalkan Penerimaan?"
        description={`Penerimaan transfer ${transfer.transferNo} akan dibatalkan. Stok akan dikurangi dari gudang tujuan dan status kembali ke Dikirim. Lanjutkan?`}
        confirmLabel="Ya, Batalkan Penerimaan"
        isPending={undoReceiveMut.isPending}
        onConfirm={() => {
          undoReceiveMut.mutate(transfer.id, {
            onSuccess: () => { toast.success("Penerimaan berhasil dibatalkan"); setUndoOpen(false); },
            onError:   (e: Error) => { toast.error(e.message); setUndoOpen(false); },
          });
        }}
        onCancel={() => setUndoOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Hapus Transfer?"
        description={
          transfer.status === "PENDING"
            ? `Transfer ${transfer.transferNo} akan dihapus permanen.`
            : `Transfer ${transfer.transferNo} sudah dikirim. Penghapusan akan membatalkan transfer dan mengembalikan stok ke gudang asal. Lanjutkan?`
        }
        confirmLabel="Ya, Hapus"
        danger
        isPending={deleteMut.isPending}
        onConfirm={() => {
          deleteMut.mutate(transfer.id, {
            onSuccess: () => { toast.success("Transfer berhasil dihapus"); navigate("/stock-transfers"); },
            onError:   (e: Error) => { toast.error(e.message); setDeleteOpen(false); },
          });
        }}
        onCancel={() => setDeleteOpen(false)}
      />
    </PageContainer>
  );
}
