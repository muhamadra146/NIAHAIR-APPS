import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { usePurchaseInvoice, useCancelPurchaseInvoice, useDeletePurchaseInvoice } from "../hooks";

const fmt = (v: string | number) => `Rp ${Number(v).toLocaleString("id-ID")}`;

function ConfirmDialog({ open, title, description, confirmLabel = "Ya, lanjutkan", danger = false, loading = false, onConfirm, onCancel }: {
  open: boolean; title: string; description: string;
  confirmLabel?: string; danger?: boolean; loading?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={loading} className="h-9">Batal</Button>
          <Button onClick={onConfirm} disabled={loading}
            className={`h-9 gap-1.5 ${danger ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}`}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "bg-primary/5 border-primary/20" : ""}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`font-mono font-semibold text-sm ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

export function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { user } = useAuthStore();
  // B7: cancel & delete hanya SUPER_ADMIN / OWNER
  const canCancelDelete = user?.roleCode === "SUPER_ADMIN" || user?.roleCode === "OWNER";

  const { data: invoice, isLoading } = usePurchaseInvoice(id!);
  const cancelMutation = useCancelPurchaseInvoice();
  const deleteMutation = useDeletePurchaseInvoice();

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="py-16 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
        </div>
      </PageContainer>
    );
  }

  if (!invoice) {
    return (
      <PageContainer>
        <div className="py-16 text-center text-sm text-muted-foreground">Faktur tidak ditemukan.</div>
      </PageContainer>
    );
  }

  const dateStr = new Date(invoice.invoiceDate).toLocaleDateString("id-ID", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <PageContainer>
      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmCancel}
        title="Batalkan Faktur"
        description={invoice.status === "POSTED"
          ? `Faktur ${invoice.invoiceNo} akan dibatalkan dan stok akan dikembalikan.`
          : `Faktur ${invoice.invoiceNo} akan dibatalkan.`}
        confirmLabel="Ya, Batalkan"
        danger
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate(invoice.id, { onSuccess: () => setConfirmCancel(false) })}
        onCancel={() => setConfirmCancel(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Hapus Faktur Pembelian"
        description={invoice.status === "POSTED"
          ? `Faktur ${invoice.invoiceNo} akan dihapus. Stok akan dikembalikan dan data di Accurate akan dihapus. Tindakan ini tidak dapat dibatalkan.`
          : `Faktur ${invoice.invoiceNo} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() =>
          deleteMutation.mutate(invoice.id, {
            onSuccess: () => navigate("/purchases"),
          })
        }
        onCancel={() => setConfirmDelete(false)}
      />

      <div className="space-y-5">
        {/* Back nav */}
        <button onClick={() => navigate("/purchases")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Pembelian
        </button>

        {/* Header card */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-mono font-bold text-lg">{invoice.invoiceNo}</h1>
                  {invoice.status === "CANCELLED" ? (
                    <Badge variant="destructive">Batal</Badge>
                  ) : invoice.accuratePurchaseInvoiceId ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                      <ExternalLink className="h-3 w-3" />
                      ✓ Accurate{invoice.accuratePurchaseInvoiceNumber ? ` · ${invoice.accuratePurchaseInvoiceNumber}` : ""}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                      Menunggu Sync
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium">{invoice.supplier.name}</p>
                <p className="text-xs text-muted-foreground">{dateStr}</p>
                {invoice.supplierInvoiceNo && (
                  <p className="text-xs text-muted-foreground">No. Supplier: {invoice.supplierInvoiceNo}</p>
                )}
                {invoice.warehouse && (
                  <p className="text-xs text-muted-foreground">Gudang: {invoice.warehouse.name}</p>
                )}
                {invoice.paymentTerms && (
                  <p className="text-xs text-muted-foreground">Syarat Pembayaran: {invoice.paymentTerms}</p>
                )}
              </div>

              {/* Action buttons — hanya SUPER_ADMIN / OWNER */}
              {canCancelDelete && (
                <div className="flex flex-wrap gap-2 shrink-0">
                  {invoice.status === "POSTED" && (
                    <Button size="sm" variant="outline"
                      onClick={() => setConfirmCancel(true)}
                      disabled={cancelMutation.isPending}
                      className="h-8 text-xs text-destructive hover:text-destructive border-destructive/40 hover:border-destructive hover:bg-destructive/5 gap-1">
                      {cancelMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                      Batalkan
                    </Button>
                  )}
                  <Button size="sm" variant="outline"
                    onClick={() => setConfirmDelete(true)}
                    disabled={deleteMutation.isPending}
                    className="h-8 text-xs text-destructive hover:text-destructive border-destructive/40 hover:border-destructive hover:bg-destructive/5">
                    Hapus
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Subtotal"    value={fmt(invoice.subtotal)} />
          <SummaryCard label="Diskon"      value={fmt(invoice.totalDiscount)} />
          <SummaryCard label="PPN"         value={fmt(invoice.totalTax)} />
          <SummaryCard label="Grand Total" value={fmt(invoice.grandTotal)} highlight />
        </div>

        {/* Items table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Rincian Barang</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Barang</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs w-20">Qty</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs w-20">Satuan</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs w-32">Harga</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs w-20">Diskon %</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs w-32">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-xs">{item.item.name}</p>
                        {item.item.itemCode && (
                          <p className="text-xs text-muted-foreground">{item.item.itemCode}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">
                        {Number(item.qty).toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.unit.name}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">{fmt(item.price)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">
                        {Number(item.discount) > 0 ? `${Number(item.discount)}%` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold">
                        {fmt(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {Number(invoice.totalDiscount) > 0 && (
                    <tr className="border-t">
                      <td colSpan={5} className="px-4 py-2 text-right text-xs text-muted-foreground">Diskon</td>
                      <td className="px-4 py-2 text-right font-mono text-xs">- {fmt(invoice.totalDiscount)}</td>
                    </tr>
                  )}
                  {invoice.taxable && (
                    <tr>
                      <td colSpan={5} className="px-4 py-2 text-right text-xs text-muted-foreground">
                        PPN 11%{invoice.inclusiveTax ? " (inklusif)" : ""}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs">{fmt(invoice.totalTax)}</td>
                    </tr>
                  )}
                  <tr className="border-t bg-muted/30">
                    <td colSpan={5} className="px-4 py-2.5 text-right text-sm font-semibold">Grand Total</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-sm">{fmt(invoice.grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Tax info */}
        {invoice.taxable && (invoice.taxInvoiceDate || invoice.taxInvoiceNo) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Info Pajak</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {invoice.taxInvoiceDate && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Tanggal Faktur Pajak</p>
                    <p className="font-medium">
                      {new Date(invoice.taxInvoiceDate).toLocaleDateString("id-ID", {
                        day: "2-digit", month: "long", year: "numeric",
                      })}
                    </p>
                  </div>
                )}
                {invoice.taxInvoiceNo && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">No. Faktur Pajak</p>
                    <p className="font-mono font-medium">{invoice.taxInvoiceNo}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {invoice.notes && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Catatan</p>
              <p className="text-sm">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Accurate info */}
        {invoice.accuratePurchaseInvoiceId && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-2">Accurate</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Accurate ID</p>
                  <p className="font-mono font-medium">{invoice.accuratePurchaseInvoiceId}</p>
                </div>
                {invoice.accuratePurchaseInvoiceNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">No. Faktur Accurate</p>
                    <p className="font-mono font-medium">{invoice.accuratePurchaseInvoiceNumber}</p>
                  </div>
                )}
                {invoice.lastSyncAt && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Terakhir Sync</p>
                    <p className="text-xs">{new Date(invoice.lastSyncAt).toLocaleString("id-ID")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
