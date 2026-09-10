import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, RefreshCw } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimpleSelect } from "@/components/ui/simple-select";
import { usePurchaseReturns } from "../hooks";
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

export function PurchaseReturnListPage() {
  const navigate = useNavigate();
  const [status, setStatus]   = useState<PurchaseReturnStatus | "">("");
  const [page,   setPage]     = useState(1);

  const { data, isLoading, isError, refetch } = usePurchaseReturns({
    status: status || undefined,
    page,
    limit: 20,
  });

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Retur Pembelian</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Daftar retur faktur pembelian</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => navigate("/purchase-returns/new")} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Buat Retur
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-4">
        <SimpleSelect
          value={status}
          onChange={(v) => { setStatus(v as PurchaseReturnStatus | ""); setPage(1); }}
          placeholder="Semua status"
          className="w-[160px]"
          options={[
            { value: "DRAFT",     label: "Draft" },
            { value: "POSTED",    label: "Posted" },
            { value: "CANCELLED", label: "Dibatalkan" },
          ]}
        />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Retur</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
            </div>
          ) : isError ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-sm text-destructive font-medium">Gagal memuat data retur pembelian</p>
              <Button variant="ghost" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" /> Coba lagi
              </Button>
            </div>
          ) : !data?.data?.length ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Belum ada retur pembelian
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium">No. Retur</th>
                      <th className="text-left px-4 py-3 font-medium">Invoice Induk</th>
                      <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                      <th className="text-left px-4 py-3 font-medium">Items</th>
                      <th className="text-right px-4 py-3 font-medium">Total</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium">Accurate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((ret) => (
                      <tr
                        key={ret.id}
                        className="border-b hover:bg-muted/20 cursor-pointer transition-colors"
                        onClick={() => navigate(`/purchase-returns/${ret.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{ret.returnNo}</td>
                        <td className="px-4 py-3 font-mono text-xs">{ret.purchaseInvoice.invoiceNo}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(ret.returnDate).toLocaleDateString("id-ID")}
                        </td>
                        <td className="px-4 py-3 text-center">{ret._count.items}</td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(ret.grandTotal)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_VARIANT[ret.status]}>{STATUS_LABEL[ret.status]}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {ret.lastSyncAt ? (
                            <Badge variant="outline" className="text-xs text-green-600">Synced</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Belum</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.total > data.limit && (
                <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                  <span>{data.total} retur</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                      Sebelumnya
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * data.limit >= data.total}>
                      Berikutnya
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
