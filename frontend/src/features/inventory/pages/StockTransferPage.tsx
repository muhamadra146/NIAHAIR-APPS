import { useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftRight, Check, CheckCircle, ExternalLink, Loader2, Plus,
  RotateCcw, Search, Trash2, TruckIcon, XCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useViewOnly } from "@/hooks/useViewOnly";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  useStockTransfers,
  useCreateStockTransfer,
  useUpdateTransferStatus,
  useDeleteStockTransfer,
  useUndoTransferReceive,
} from "../hooks";
import { fetchWarehouses } from "@/features/settings/api/warehouse.api";
import { fetchInvoiceItems } from "@/features/invoice/api";
import type { StockTransfer } from "../types";

// ── Status labels ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING:    { label: "Pending",    className: "text-yellow-700 border-yellow-300 bg-yellow-50" },
  IN_TRANSIT: { label: "Dikirim",    className: "text-blue-700 border-blue-300 bg-blue-50" },
  RECEIVED:   { label: "Diterima",   className: "text-green-700 border-green-300 bg-green-50" },
  CANCELLED:  { label: "Dibatalkan", className: "text-red-700 border-red-300 bg-red-50" },
};

interface TransferItemLine { itemId: string; qty: number; itemName: string; }

// ── Accurate sync mini-badge ──────────────────────────────────────────────────

function AccurateSyncBadge({ transfer }: { transfer: StockTransfer }) {
  const isReceived   = transfer.status === "RECEIVED";
  const outSynced    = !!transfer.accurateTransferId;
  const receiveSynced = !!transfer.accurateReceiveId;

  if (transfer.status === "PENDING" || transfer.status === "CANCELLED") return null;

  const allSynced = outSynced && (!isReceived || receiveSynced);

  if (allSynced) {
    return (
      <span title="Tersinkron ke Accurate" className="inline-flex items-center gap-0.5 text-green-600">
        <CheckCircle className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <span title="Belum disinkronkan ke Accurate" className="inline-flex items-center gap-0.5 text-muted-foreground/50">
      <XCircle className="h-3.5 w-3.5" />
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function StockTransferPage() {
  const { branchId, user } = useAuthStore();
  const isViewOnly = useViewOnly();
  const navigate   = useNavigate();

  const [page, setPage]             = useState(1);
  const [filterStatus, setStatus]   = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch]         = useState("");
  const [startDate, setStartDate]   = useState("");
  const [endDate, setEndDate]       = useState("");

  const { data, isLoading } = useStockTransfers({
    page, limit: 20, branchId: branchId ?? undefined,
    status: filterStatus as "PENDING" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED" | "" || undefined,
    search:    search    || undefined,
    startDate: startDate || undefined,
    endDate:   endDate   || undefined,
  });
  const transfers  = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / 20) : 1;

  const updateStatusMut = useUpdateTransferStatus();
  const deleteMut       = useDeleteStockTransfer();
  const undoReceiveMut  = useUndoTransferReceive();

  const isSuperUser = user?.roleCode === "SUPER_ADMIN" || user?.roleCode === "OWNER";

  function canKirim(t: typeof transfers[number]) {
    if (t.status !== "PENDING") return false;
    if (isSuperUser) return true;
    return !t.sourceWarehouse.branchId || t.sourceWarehouse.branchId === branchId;
  }

  function canTerima(t: typeof transfers[number]) {
    if (t.status !== "IN_TRANSIT") return false;
    if (isSuperUser) return true;
    return !t.destinationWarehouse.branchId || t.destinationWarehouse.branchId === branchId;
  }

  function canDelete(t: typeof transfers[number]) {
    if (t.status !== "PENDING" && t.status !== "IN_TRANSIT") return false;
    if (isSuperUser) return true;
    return !t.sourceWarehouse.branchId || t.sourceWarehouse.branchId === branchId;
  }

  function canUndoReceive(t: typeof transfers[number]) {
    if (t.status !== "RECEIVED") return false;
    if (isSuperUser) return true;
    return !t.destinationWarehouse.branchId || t.destinationWarehouse.branchId === branchId;
  }

  const [expandedId, setExpandedId]      = useState<string | null>(null);
  const [receiveTarget, setReceiveTarget] = useState<StockTransfer | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<StockTransfer | null>(null);
  const [undoTarget, setUndoTarget]       = useState<StockTransfer | null>(null);
  const [kirimTarget, setKirimTarget]     = useState<StockTransfer | null>(null);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleAction(id: string, status: string) {
    updateStatusMut.mutate({ id, status, branchId }, {
      onSuccess: () => toast.success("Status transfer berhasil diperbarui"),
      onError:   (e: Error) => toast.error(e.message),
    });
  }

  return (
    <PageContainer title="Transfer Stok" subtitle="Pemindahan stok antar gudang dan cabang">
      <Card>
        <CardHeader className="pb-3 pt-4 space-y-3">
          {/* Row 1: status filter + create button */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-1 flex-wrap">
              {[
                { key: "",           label: "Semua" },
                { key: "PENDING",    label: "Pending" },
                { key: "IN_TRANSIT", label: "Dikirim" },
                { key: "RECEIVED",   label: "Diterima" },
                { key: "CANCELLED",  label: "Dibatalkan" },
              ].map((s) => (
                <button key={s.key} onClick={() => { setStatus(s.key); setPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filterStatus === s.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
            {!isViewOnly && (
              <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> Buat Transfer
              </Button>
            )}
          </div>
          {/* Row 2: search + date filter */}
          <div className="flex flex-wrap gap-2 items-end">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Cari no. transfer..."
                className="pl-8 h-9 text-sm"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Dari</Label>
                <Input type="date" value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="h-9 text-sm w-36" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Sampai</Label>
                <Input type="date" value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="h-9 text-sm w-36" />
              </div>
              {(search || startDate || endDate) && (
                <Button variant="ghost" size="sm" className="h-9 text-xs"
                  onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); setPage(1); }}>
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : transfers.length === 0 ? (
            <EmptyState
              icon={<ArrowLeftRight className="w-6 h-6" />}
              title="Belum ada transfer stok"
              description="Buat transfer untuk memindahkan stok antar cabang"
            />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">No. Transfer</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dari</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ke</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Items</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground w-10" title="Accurate sync">A</th>
                      <th className="px-4 py-3 w-32" />
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((t) => {
                      const s        = STATUS_LABELS[t.status];
                      const expanded = expandedId === t.id;
                      return (
                        <Fragment key={t.id}>
                          <tr
                            className="border-b border-border transition-colors hover:bg-muted/30 cursor-pointer"
                            onClick={() => toggleExpand(t.id)}>
                            <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); navigate(`/stock-transfers/${t.id}`); }}>
                              <div className="flex items-center gap-1.5 group">
                                <span className="font-mono text-sm font-medium text-primary hover:underline">{t.transferNo}</span>
                                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{formatDate(t.transferDate)}</td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{t.sourceWarehouse.name}</p>
                              {t.sourceWarehouse.branch && (
                                <p className="text-xs text-muted-foreground">{t.sourceWarehouse.branch.name}</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{t.destinationWarehouse.name}</p>
                              {t.destinationWarehouse.branch && (
                                <p className="text-xs text-muted-foreground">{t.destinationWarehouse.branch.name}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{t.items.length} item</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={`text-xs ${s?.className ?? ""}`}>
                                {s?.label ?? t.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <AccurateSyncBadge transfer={t} />
                            </td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-1 justify-end">
                                {canKirim(t) && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                    disabled={updateStatusMut.isPending}
                                    onClick={() => setKirimTarget(t)}>
                                    <TruckIcon className="h-3 w-3" /> Kirim
                                  </Button>
                                )}
                                {canTerima(t) && (
                                  <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                                    disabled={updateStatusMut.isPending}
                                    onClick={() => setReceiveTarget(t)}>
                                    <Check className="h-3 w-3" /> Terima
                                  </Button>
                                )}
                                {canUndoReceive(t) && (
                                  <Button size="sm" variant="outline"
                                    className="h-7 text-xs gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                                    disabled={undoReceiveMut.isPending}
                                    onClick={() => setUndoTarget(t)}>
                                    <RotateCcw className="h-3 w-3" /> Batal Terima
                                  </Button>
                                )}
                                {canDelete(t) && (
                                  <Button size="sm" variant="outline"
                                    className="h-7 text-xs gap-1 text-red-600 border-red-300 hover:bg-red-50"
                                    disabled={deleteMut.isPending}
                                    onClick={() => setDeleteTarget(t)}>
                                    <Trash2 className="h-3 w-3" /> Hapus
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="bg-muted/20">
                              <td colSpan={8} className="px-6 pb-3 pt-0">
                                <p className="text-xs font-medium text-muted-foreground mb-1.5">Detail Item</p>
                                <div className="flex flex-wrap gap-2">
                                  {t.items.map((item) => (
                                    <div key={item.id}
                                      className="flex items-center gap-1.5 bg-background border border-border rounded px-2.5 py-1 text-xs">
                                      <span className="font-medium">{item.item.name}</span>
                                      <span className="text-muted-foreground">·</span>
                                      <span className="font-semibold">
                                        {Number(item.qty).toLocaleString("id-ID")} pcs
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                {t.notes && (
                                  <p className="text-xs text-muted-foreground mt-1.5">Catatan: {t.notes}</p>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-border">
                {transfers.map((t) => {
                  const s        = STATUS_LABELS[t.status];
                  const expanded = expandedId === t.id;
                  return (
                    <div key={t.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 cursor-pointer"
                          onClick={() => navigate(`/stock-transfers/${t.id}`)}>
                          <p className="font-mono text-sm font-medium text-primary">{t.transferNo}</p>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <AccurateSyncBadge transfer={t} />
                          <Badge variant="outline" className={`text-xs ${s?.className ?? ""}`}
                            onClick={() => toggleExpand(t.id)}>
                            {s?.label ?? t.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span>{t.sourceWarehouse.name}</span>
                        <span className="mx-2">→</span>
                        <span>{t.destinationWarehouse.name}</span>
                      </div>
                      {expanded && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {t.items.map((item) => (
                            <div key={item.id}
                              className="flex items-center gap-1 bg-muted rounded px-2 py-0.5 text-xs">
                              <span>{item.item.name}</span>
                              <span className="font-semibold">{Number(item.qty).toLocaleString("id-ID")}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(t.transferDate)} · {t.items.length} item
                        </span>
                        <div className="flex gap-1 flex-wrap">
                          {canKirim(t) && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                              disabled={updateStatusMut.isPending}
                              onClick={() => setKirimTarget(t)}>
                              <TruckIcon className="h-3 w-3" /> Kirim
                            </Button>
                          )}
                          {canTerima(t) && (
                            <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                              disabled={updateStatusMut.isPending}
                              onClick={() => setReceiveTarget(t)}>
                              <Check className="h-3 w-3" /> Terima
                            </Button>
                          )}
                          {canUndoReceive(t) && (
                            <Button size="sm" variant="outline"
                              className="h-7 text-xs gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                              disabled={undoReceiveMut.isPending}
                              onClick={() => setUndoTarget(t)}>
                              <RotateCcw className="h-3 w-3" /> Batal Terima
                            </Button>
                          )}
                          {canDelete(t) && (
                            <Button size="sm" variant="outline"
                              className="h-7 text-xs gap-1 text-red-600 border-red-300 hover:bg-red-50"
                              disabled={deleteMut.isPending}
                              onClick={() => setDeleteTarget(t)}>
                              <Trash2 className="h-3 w-3" /> Hapus
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>

        <Pagination page={page} limit={20} total={meta?.total ?? 0} totalPages={totalPages} onPageChange={setPage} />
      </Card>

      {showCreate && <CreateTransferDialog onClose={() => setShowCreate(false)} />}

      {receiveTarget && (
        <ReceiveDialog
          transfer={receiveTarget}
          branchId={branchId}
          onClose={() => setReceiveTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Hapus Transfer"
          description={
            deleteTarget.status === "PENDING"
              ? `Transfer ${deleteTarget.transferNo} akan dihapus permanen. Lanjutkan?`
              : `Transfer ${deleteTarget.transferNo} sudah dikirim. Penghapusan akan membatalkan transfer dan mengembalikan stok ke gudang asal. Mutasi barang tetap tercatat. Lanjutkan?`
          }
          confirmLabel="Hapus"
          confirmVariant="destructive"
          isPending={deleteMut.isPending}
          onConfirm={() => {
            deleteMut.mutate(deleteTarget.id, {
              onSuccess: () => { toast.success("Transfer berhasil dihapus"); setDeleteTarget(null); },
              onError:   (e: Error) => toast.error(e.message),
            });
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {undoTarget && (
        <ConfirmDialog
          title="Batalkan Penerimaan"
          description={`Penerimaan transfer ${undoTarget.transferNo} akan dibatalkan. Stok akan dikurangi dari gudang tujuan dan status kembali ke Dikirim. Mutasi barang tetap tercatat. Lanjutkan?`}
          confirmLabel="Batalkan Penerimaan"
          confirmVariant="outline"
          isPending={undoReceiveMut.isPending}
          onConfirm={() => {
            undoReceiveMut.mutate(undoTarget.id, {
              onSuccess: () => { toast.success("Penerimaan transfer berhasil dibatalkan"); setUndoTarget(null); },
              onError:   (e: Error) => toast.error(e.message),
            });
          }}
          onCancel={() => setUndoTarget(null)}
        />
      )}

      {kirimTarget && (
        <ConfirmDialog
          title="Kirim Transfer"
          description={`Transfer ${kirimTarget.transferNo} akan dikirim dari ${kirimTarget.sourceWarehouse.name}. Stok barang akan dikurangi dari gudang asal dan data dikirim ke Accurate. Lanjutkan?`}
          confirmLabel="Ya, Kirim"
          confirmVariant="default"
          isPending={updateStatusMut.isPending}
          onConfirm={() => {
            updateStatusMut.mutate(
              { id: kirimTarget.id, status: "IN_TRANSIT", branchId },
              {
                onSuccess: () => { toast.success("Transfer berhasil dikirim"); setKirimTarget(null); },
                onError:   (e: Error) => { toast.error(e.message); setKirimTarget(null); },
              },
            );
          }}
          onCancel={() => setKirimTarget(null)}
        />
      )}
    </PageContainer>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  title, description, confirmLabel, confirmVariant = "default", isPending, onConfirm, onCancel,
}: {
  title:           string;
  description:     string;
  confirmLabel:    string;
  confirmVariant?: "default" | "destructive" | "outline";
  isPending:       boolean;
  onConfirm:       () => void;
  onCancel:        () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>Batal</Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Receive Dialog (partial receive) ─────────────────────────────────────────

function ReceiveDialog({
  transfer,
  branchId,
  onClose,
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

  function handleQtyChange(itemId: string, val: string) {
    setQtys((prev) => ({ ...prev, [itemId]: val }));
  }

  function handleSubmit() {
    for (const it of inventoryItems) {
      const val = Number(qtys[it.itemId]);
      if (isNaN(val) || val < 0)     return toast.error(`Qty tidak valid untuk ${it.item.name}`);
      if (val > Number(it.qty))      return toast.error(`Qty terima tidak boleh melebihi qty kirim (${it.item.name})`);
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
                    onChange={(e) => handleQtyChange(it.itemId, e.target.value)}
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
          <Button onClick={handleSubmit} disabled={updateStatusMut.isPending}
            className="bg-green-600 hover:bg-green-700">
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

// ── Create Transfer Dialog ────────────────────────────────────────────────────

function CreateTransferDialog({ onClose }: { onClose: () => void }) {
  const [sourceWarehouseId, setSource]    = useState("");
  const [destinationWarehouseId, setDest] = useState("");
  const [transferDate, setDate]           = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes]                 = useState("");
  const [lines, setLines]                 = useState<TransferItemLine[]>([]);
  const [itemSearch, setItemSearch]       = useState("");
  const [dSearch, setDSearch]             = useState("");
  const [showItemDrop, setShowItemDrop]   = useState(false);

  const { data: whData } = useQuery({
    queryKey:  ["warehouses-all"],
    queryFn:   () => fetchWarehouses({ limit: 100 }),
    staleTime: 60_000,
  });
  const warehouses = whData?.data ?? [];

  const { data: itemResults } = useQuery({
    queryKey:  ["item-search-transfer", dSearch],
    queryFn:   () => fetchInvoiceItems(dSearch),
    enabled:   dSearch.length >= 2,
    staleTime: 10_000,
  });

  const createTransfer = useCreateStockTransfer();

  function handleItemSearchChange(val: string) {
    setItemSearch(val);
    clearTimeout((handleItemSearchChange as unknown as { t?: ReturnType<typeof setTimeout> }).t);
    (handleItemSearchChange as unknown as { t?: ReturnType<typeof setTimeout> }).t = setTimeout(
      () => setDSearch(val), 300,
    );
    setShowItemDrop(val.length >= 2);
  }

  function selectItem(item: { id: string; name: string }) {
    if (lines.find((l) => l.itemId === item.id)) { setShowItemDrop(false); return; }
    setLines((prev) => [...prev, { itemId: item.id, qty: 1, itemName: item.name }]);
    setItemSearch(""); setDSearch(""); setShowItemDrop(false);
  }

  function updateQty(itemId: string, qty: number) {
    setLines((prev) => prev.map((l) => l.itemId === itemId ? { ...l, qty } : l));
  }

  function removeLine(itemId: string) {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }

  function handleSubmit() {
    if (!sourceWarehouseId)      return toast.error("Pilih gudang asal");
    if (!destinationWarehouseId) return toast.error("Pilih gudang tujuan");
    if (sourceWarehouseId === destinationWarehouseId) return toast.error("Gudang asal dan tujuan tidak boleh sama");
    if (lines.length === 0)      return toast.error("Tambahkan minimal 1 item");
    if (lines.some((l) => !l.qty || l.qty <= 0)) return toast.error("Qty harus lebih dari 0");

    createTransfer.mutate(
      {
        sourceWarehouseId,
        destinationWarehouseId,
        transferDate,
        notes: notes || undefined,
        items: lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
      },
      {
        onSuccess: () => { toast.success("Transfer berhasil dibuat"); onClose(); },
        onError:   (e: Error) => toast.error(e.message),
      },
    );
  }

  const filteredResults = (itemResults ?? []).filter((it) => it.itemType === "INVENTORY");

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Buat Transfer Stok</DialogTitle></DialogHeader>

        <div className="space-y-4 py-1">
          {/* Warehouses */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Gudang Asal <span className="text-destructive">*</span></Label>
              <select value={sourceWarehouseId} onChange={(e) => setSource(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none">
                <option value="">— Pilih gudang —</option>
                {warehouses.filter((w) => w.isActive).map((w) => (
                  <option key={w.id} value={w.id}>{w.name}{w.branch ? ` (${w.branch.name})` : ""}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Gudang Tujuan <span className="text-destructive">*</span></Label>
              <select value={destinationWarehouseId} onChange={(e) => setDest(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none">
                <option value="">— Pilih gudang —</option>
                {warehouses
                  .filter((w) => w.isActive && w.id !== sourceWarehouseId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>{w.name}{w.branch ? ` (${w.branch.name})` : ""}</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Date + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Tanggal Transfer</Label>
              <Input type="date" value={transferDate} onChange={(e) => setDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Catatan</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" className="h-9" />
            </div>
          </div>

          {/* Item search */}
          <div className="space-y-2">
            <Label className="text-sm">Item</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={itemSearch}
                onChange={(e) => handleItemSearchChange(e.target.value)}
                onFocus={() => { if (itemSearch.length >= 2) setShowItemDrop(true); }}
                onBlur={() => setTimeout(() => setShowItemDrop(false), 150)}
                placeholder="Ketik minimal 2 huruf untuk cari item..."
                className="pl-8 h-9"
              />
            </div>

            {showItemDrop && filteredResults.length > 0 && (
              <div className="border border-border rounded-md overflow-hidden shadow-sm">
                {filteredResults.slice(0, 8).map((it) => (
                  <button key={it.id} type="button" onMouseDown={() => selectItem(it)}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors border-b border-border/40 last:border-0 flex items-center justify-between gap-2">
                    <span className="font-medium">{it.name}</span>
                    {it.itemCode && (
                      <span className="text-xs text-muted-foreground font-mono shrink-0">{it.itemCode}</span>
                    )}
                  </button>
                ))}
                {filteredResults.length > 8 && (
                  <p className="px-3 py-1.5 text-xs text-muted-foreground text-center bg-muted/30">
                    +{filteredResults.length - 8} item lainnya — perjelas pencarian
                  </p>
                )}
              </div>
            )}

            {lines.length > 0 && (
              <div className="border rounded-md divide-y text-sm">
                {lines.map((line) => (
                  <div key={line.itemId} className="flex items-center gap-2 px-3 py-2">
                    <span className="flex-1 truncate">{line.itemName}</span>
                    <Input type="number" min={0.001} step={0.001} value={line.qty}
                      onChange={(e) => updateQty(line.itemId, parseFloat(e.target.value) || 0)}
                      className="h-7 w-24 text-right text-xs" />
                    <button type="button" onClick={() => removeLine(line.itemId)}
                      className="text-muted-foreground hover:text-destructive shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createTransfer.isPending}>Batal</Button>
          <Button onClick={handleSubmit} disabled={createTransfer.isPending}>
            {createTransfer.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Buat Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
