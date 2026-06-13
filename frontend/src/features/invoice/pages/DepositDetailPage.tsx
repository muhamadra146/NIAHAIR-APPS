import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, CreditCard, ImageIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useDeposit, useDepositPayments } from "../hooks";

const STATUS_LABEL: Record<string, string> = {
  UNPAID:       "Belum Dibayar",
  PAID:         "Aktif",
  PARTIAL_USED: "Sebagian Terpakai",
  USED:         "Habis",
  REFUNDED:     "Di-refund",
  CANCELLED:    "Dibatalkan",
};

const STATUS_COLOR: Record<string, string> = {
  UNPAID:       "text-yellow-600 border-yellow-300",
  PAID:         "text-green-600 border-green-300",
  PARTIAL_USED: "text-blue-600 border-blue-300",
  USED:         "text-muted-foreground",
  REFUNDED:     "text-orange-600 border-orange-300",
  CANCELLED:    "text-destructive border-destructive/30",
};

export function DepositDetailPage() {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const { data: deposit, isLoading, isError } = useDeposit(id!);
  const { data: payments = [] }               = useDepositPayments(id!);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="max-w-lg mx-auto space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !deposit) {
    return (
      <PageContainer>
        <div className="py-12 text-center text-sm text-muted-foreground">
          Deposit tidak ditemukan.{" "}
          <Link to="/deposits" className="text-primary underline">Kembali</Link>
        </div>
      </PageContainer>
    );
  }

  const canPay = deposit.status === "UNPAID" && payments.length === 0;

  return (
    <PageContainer>
      <div className="max-w-lg mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link to="/deposits"><ChevronLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Detail Deposit</h1>
            <p className="text-sm text-muted-foreground">{deposit.customer?.name ?? "—"}</p>
          </div>
        </div>

        {/* Deposit info */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Info Deposit</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-3">
            <Row label="Customer"   value={deposit.customer?.name ?? "—"} />
            <Row label="No. Telepon" value={deposit.customer?.mobilePhone ?? "—"} />
            <Row label="Tanggal"    value={formatDate(deposit.createdAt)} />
            <Row label="Status">
              <Badge variant="outline" className={`text-xs ${STATUS_COLOR[deposit.status] ?? ""}`}>
                {STATUS_LABEL[deposit.status] ?? deposit.status}
              </Badge>
            </Row>
            <div className="border-t border-border/50 pt-3 space-y-3">
              <Row label="Jumlah Deposit">
                <span className="font-bold text-base">{formatCurrency(deposit.amount)}</span>
              </Row>
              <Row label="Terpakai">
                <span className={Number(deposit.usedAmount) > 0 ? "font-medium" : "text-muted-foreground"}>
                  {Number(deposit.usedAmount) > 0 ? formatCurrency(deposit.usedAmount) : "—"}
                </span>
              </Row>
              <Row label="Sisa">
                <span className={Number(deposit.remainingAmount) > 0 ? "font-medium text-green-700" : "text-muted-foreground"}>
                  {Number(deposit.remainingAmount) > 0 ? formatCurrency(deposit.remainingAmount) : "—"}
                </span>
              </Row>
            </div>
            {deposit.notes && (
              <div className="border-t border-border/50 pt-3">
                <p className="text-xs text-muted-foreground mb-1">Catatan</p>
                <p className="text-sm">{deposit.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment history */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Riwayat Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada pembayaran</p>
            ) : (
              <div className="space-y-4">
                {payments.map((p) => (
                  <div key={p.id} className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{p.paymentMethod?.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(p.paidAt)} · {p.paymentNo}
                          </p>
                          {p.referenceNo && (
                            <p className="text-xs text-muted-foreground">Ref: {p.referenceNo}</p>
                          )}
                          {p.notes && (
                            <p className="text-xs text-muted-foreground">{p.notes}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-green-700 shrink-0">
                        {formatCurrency(p.amount)}
                      </span>
                    </div>

                    {/* Transfer proof photo */}
                    {p.transferProofUrl && (
                      <div className="ml-6">
                        <p className="text-xs text-muted-foreground mb-1.5">Bukti Transfer</p>
                        <a href={p.transferProofUrl} target="_blank" rel="noopener noreferrer">
                          <img
                            src={p.transferProofUrl}
                            alt="Bukti transfer"
                            className="max-h-48 w-full rounded-md border border-border object-contain bg-muted/30 hover:opacity-90 transition-opacity cursor-pointer"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CTA — bayar jika masih UNPAID */}
        {canPay && (
          <Button className="w-full h-11" onClick={() => navigate(`/deposits/${id}/pay`)}>
            Catat Pembayaran
          </Button>
        )}
      </div>
    </PageContainer>
  );
}

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      {children ?? <span className="text-sm font-medium text-right">{value}</span>}
    </div>
  );
}
