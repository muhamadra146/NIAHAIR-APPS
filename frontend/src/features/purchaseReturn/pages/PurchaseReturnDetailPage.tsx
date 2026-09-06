import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, RefreshCw, Trash2, CheckCircle, XCircle, Send } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  usePurchaseReturn,
  usePostPurchaseReturn,
  useCancelPurchaseReturn,
  useDeletePurchaseReturn,
  useSyncPurchaseReturnToAccurate,
} from "../hooks";
import type { PurchaseReturnStatus } from "../types";

const STATUS_LABEL: Record<PurchaseReturnStatus, string> = {
  DRAFT:     "Draft",
  POSTED:    "Posted",
  CANCELLED: "Dibatalkan",
};

const STATUS_VARIANT: Record<PurchaseReturnStatus, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT:     "secondary",
  POSTED:    "default",
  CANCELLED: "destructive",
};

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

export function PurchaseReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: ret, isLoading, refetch } = usePurchaseReturn(id!);
  const postMutation   = usePostPurchaseReturn();
  const cancelMutation = useCancelPurchaseReturn();
  const deleteMutation = useDeletePurchaseReturn();
  const syncMutation   = useSyncPurchaseReturnToAccurate();

  const [confirmPost,   setConfirmPost]   = useState(false);
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
  if (!ret) {
    return (
      <PageContainer>
        <div className="py-16 text-center text-sm text-muted-foreground">Retur tidak ditemukan</div>
      </PageContainer>
    );
  }

  const isDraft     = ret.status === "DRAFT";
  const isPosted    = ret.status === "POSTED";
  const isCancelled = ret.status === "CANCELLED";

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono">{ret.returnNo}</h1>
              <Badge variant={STATUS_VARIANT[ret.status]}>{STATUS_LABEL[ret.status]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Invoice: <span className="font-mono">{ret.purchaseInvoice.invoiceNo}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {isDraft && (
            <>
              <Button size="sm" onClick={() => setConfirmPost(true)} className="gap-1.5">
                <CheckCircle className="h-4 w-4" />
                Posting
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmCancel(true)} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5">
                <XCircle className="h-4 w-4" />
                Batalkan
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)} className="gap-1.5">
                <Trash2 className="h-4 w-4" />
                Hapus
              </Button>
            </>
          )}
          {isPosted && !ret.lastSyncAt && (
            <Button variant="outline" size="sm" onClick={() => syncMutation.mutate(id!)} disabled={syncMutation.isPending} className="gap-1.5">
              {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Sync Accurate
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Info card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informasi Retur</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">No. Retur</dt>
                  <dd className="font-mono font-semibold">{ret.returnNo}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tanggal Retur</dt>
                  <dd>{new Date(ret.returnDate).toLocaleDateString("id-ID")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Invoice Induk</dt>
                  <dd className="font-mono">{ret.purchaseInvoice.invoiceNo}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Dibuat Oleh</dt>
                  <dd>{ret.createdBy?.fullName ?? "—"}</dd>
                </div>
                {ret.notes && (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Catatan</dt>
                    <dd>{ret.notes}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Item Retur</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium">Barang</th>
                      <th className="text-left px-4 py-3 font-medium">Satuan</th>
                      <th className="text-right px-4 py-3 font-medium">Qty</th>
                      <th className="text-right px-4 py-3 font-medium">Harga</th>
                      <th className="text-right px-4 py-3 font-medium">Subtotal</th>
                      <th className="text-center px-4 py-3 font-medium">Stok</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ret.items.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.item.name}</div>
                          {item.item.sku && (
                            <div className="text-xs text-muted-foreground font-mono">{item.item.sku}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.unit.name}</td>
                        <td className="px-4 py-3 text-right font-mono">{Number(item.qty).toLocaleString("id-ID")}</td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(item.price)}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">{fmt(item.subtotal)}</td>
                        <td className="px-4 py-3 text-center">
                          {item.inventoryMovement ? (
                            <Badge variant="outline" className="text-xs text-green-600">✓ Bergerak</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Belum</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Totals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{fmt(ret.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t pt-3">
                <span>Total Retur</span>
                <span className="font-mono text-primary">{fmt(ret.grandTotal)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Accurate sync status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Accurate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {ret.accuratePurchaseReturnId ? (
                <>
                  <div className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Tersinkron</span>
                  </div>
                  {ret.accurateReturnNo && (
                    <div>
                      <span className="text-muted-foreground">No. Accurate: </span>
                      <span className="font-mono">{ret.accurateReturnNo}</span>
                    </div>
                  )}
                  {ret.lastSyncAt && (
                    <div className="text-xs text-muted-foreground">
                      {new Date(ret.lastSyncAt).toLocaleString("id-ID")}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground">Belum disinkronkan</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmPost}
        title="Posting Retur?"
        description={`Retur ${ret.returnNo} akan di-posting. Stok barang akan dikurangi dan data dikirim ke Accurate.`}
        confirmLabel="Ya, Posting"
        loading={postMutation.isPending}
        onConfirm={() => {
          postMutation.mutate(id!, { onSuccess: () => setConfirmPost(false) });
        }}
        onCancel={() => setConfirmPost(false)}
      />
      <ConfirmDialog
        open={confirmCancel}
        title="Batalkan Retur?"
        description={`Retur ${ret.returnNo} akan dibatalkan. Tindakan ini tidak dapat diurungkan.`}
        confirmLabel="Ya, Batalkan"
        danger
        loading={cancelMutation.isPending}
        onConfirm={() => {
          cancelMutation.mutate(id!, { onSuccess: () => setConfirmCancel(false) });
        }}
        onCancel={() => setConfirmCancel(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Hapus Retur?"
        description={`Retur ${ret.returnNo} akan dihapus permanen.`}
        confirmLabel="Ya, Hapus"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutate(id!, { onSuccess: () => navigate("/purchase-returns") });
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </PageContainer>
  );
}
