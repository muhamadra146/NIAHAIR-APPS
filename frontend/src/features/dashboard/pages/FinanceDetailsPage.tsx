import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { PageContainer }     from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button }            from "@/components/ui/button";
import { formatDate }        from "@/lib/utils";
import { useFinanceDetails } from "../hooks";
import { useFinanceFilters } from "../filters";
import { FinanceFilterBar, IDR, periodLabel, apiErrorMessage } from "./FinanceDashboardPage";
import { payrollMonthLabel } from "@/features/payroll/period";
import type { FinanceDetails, IncomeRow, IncomeRowType, PaidPayrollRow, PurchaseRow } from "../types";

const TYPE_LABEL: Record<IncomeRowType, string> = {
  INVOICE_PAYMENT: "Bayar invoice",
  DEPOSIT_PAYMENT: "Bayar DP",
  DEPOSIT_APPLIED: "DP dipakai",
  DEPOSIT_REFUND:  "DP dikembalikan",
};

const money = (n: number) => (Math.abs(n) < 0.5 ? "–" : IDR(n));

function refLink(r: IncomeRow) {
  if (r.invoiceId) return `/invoices/${r.invoiceId}`;
  if (r.depositId) return `/deposits/${r.depositId}`;
  return null;
}

/** Potongan satu baris untuk tooltip: "PPN Rp …, Ongkos PP Rp …" */
function deductionText(r: IncomeRow) {
  const d = r.deductions;
  return ([["PPN", d.tax], ["Ongkos PP", d.ongkosPP], ["50% Lembur", d.lemburTeam], ["Tim HS", d.hsTeam], ["Komisi", d.commission]] as const)
    .filter(([, v]) => Math.abs(v) >= 0.5)
    .map(([k, v]) => `${k} ${IDR(v)}`)
    .join(" · ");
}

function IncomeTable({ rows }: { rows: IncomeRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <th className="px-3 py-2.5 font-medium">Tanggal</th>
          <th className="px-3 py-2.5 font-medium">Jenis</th>
          <th className="px-3 py-2.5 font-medium">No. / Client</th>
          <th className="px-3 py-2.5 font-medium text-right">Kotor</th>
          <th className="px-3 py-2.5 font-medium text-right">Bersih sblm komisi</th>
          <th className="px-3 py-2.5 font-medium text-right">Bersih stlh komisi</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const to = refLink(r);
          return (
            <tr key={`${r.type}-${r.ref}-${i}`} className="border-b border-border/50 align-top hover:bg-muted/30">
              <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.date)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{TYPE_LABEL[r.type]}</td>
              <td className="px-3 py-2">
                {to ? <Link to={to} className="font-medium text-primary hover:underline">{r.invoiceNo ?? r.ref}</Link> : <span className="font-medium">{r.ref}</span>}
                <div className="text-xs text-muted-foreground">{r.customerName ?? "—"}</div>
                {deductionText(r) && <div className="text-[11px] text-muted-foreground">Potongan: {deductionText(r)}</div>}
                {r.commissionPending && (
                  <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-amber-700">
                    <AlertTriangle className="h-3 w-3" /> Input Pekerjaan belum diisi
                  </div>
                )}
              </td>
              <td className={`px-3 py-2 text-right whitespace-nowrap ${r.gross < 0 ? "text-red-600" : ""}`}>{money(r.gross)}</td>
              <td className={`px-3 py-2 text-right whitespace-nowrap ${r.netBefore < 0 ? "text-red-600" : ""}`}>{money(r.netBefore)}</td>
              <td className={`px-3 py-2 text-right whitespace-nowrap ${r.netAfter < 0 ? "text-red-600" : ""}`}>{money(r.netAfter)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PurchaseTable({ rows }: { rows: PurchaseRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <th className="px-3 py-2.5 font-medium">Tanggal</th>
          <th className="px-3 py-2.5 font-medium">No. Faktur</th>
          <th className="px-3 py-2.5 font-medium">Supplier</th>
          <th className="px-3 py-2.5 font-medium">Gudang</th>
          <th className="px-3 py-2.5 font-medium text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
            <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.invoiceDate)}</td>
            <td className="px-3 py-2">
              <Link to={`/purchases/${r.id}`} className="font-medium text-primary hover:underline">{r.invoiceNo}</Link>
              {r.supplierInvoiceNo && <div className="text-xs text-muted-foreground">{r.supplierInvoiceNo}</div>}
            </td>
            <td className="px-3 py-2">{r.supplier?.name ?? "—"}</td>
            <td className="px-3 py-2">{r.warehouse?.name ?? "—"}</td>
            <td className="px-3 py-2 text-right whitespace-nowrap">{IDR(r.grandTotal)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PayrollTable({ rows }: { rows: PaidPayrollRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <th className="px-3 py-2.5 font-medium">Tanggal Bayar</th>
          <th className="px-3 py-2.5 font-medium">Karyawan</th>
          <th className="px-3 py-2.5 font-medium">Gaji</th>
          <th className="px-3 py-2.5 font-medium text-right">Pendapatan</th>
          <th className="px-3 py-2.5 font-medium text-right">Potongan</th>
          <th className="px-3 py-2.5 font-medium text-right">Gaji Bersih</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
            <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.paidAt)}</td>
            <td className="px-3 py-2">
              <span className="font-medium">{r.employee.name}</span>
              <div className="text-xs text-muted-foreground">{r.branch.name}</div>
            </td>
            <td className="px-3 py-2 whitespace-nowrap">
              Gaji {payrollMonthLabel(r.periodStart)}
              {r.accurateJournalNumber && <div className="text-xs text-muted-foreground">{r.accurateJournalNumber}</div>}
            </td>
            <td className="px-3 py-2 text-right whitespace-nowrap">{IDR(r.grossIncome)}</td>
            <td className="px-3 py-2 text-right whitespace-nowrap">{IDR(r.totalDeductions)}</td>
            <td className="px-3 py-2 text-right whitespace-nowrap font-semibold">{IDR(r.netSalary)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const KIND_BY_PARAM: Record<string, FinanceDetails["type"]> = {
  pendapatan: "revenue",
  pembelian:  "purchases",
  gaji:       "payroll",
};

const TITLE: Record<FinanceDetails["type"], string> = {
  revenue:   "Rincian Pendapatan",
  purchases: "Rincian Pembelian Gudang",
  payroll:   "Rincian Gaji Dibayar",
};

export function FinanceDetailsPage() {
  const [sp] = useSearchParams();
  const kind = KIND_BY_PARAM[sp.get("jenis") ?? ""] ?? "revenue";
  const { startDate, endDate, apiParams, query, rangeError } = useFinanceFilters();
  const { data, isLoading, isError, error, refetch } = useFinanceDetails(kind, apiParams, !rangeError);

  const title = TITLE[kind];

  return (
    <PageContainer
      title={title}
      subtitle={periodLabel(startDate, endDate)}
      action={
        <Button asChild size="sm" variant="outline" className="gap-2">
          <Link to={`/finance?${query}`}><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <FinanceFilterBar />

        {rangeError ? null : isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
        ) : isError || !data ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-8 text-center">
            <p className="text-sm font-medium text-destructive">{apiErrorMessage(error, "Gagal memuat rincian")}</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => refetch()}>Coba lagi</Button>
          </div>
        ) : (
          <>
            {data.type === "revenue" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {([["Pendapatan Kotor", data.summary.gross], ["Bersih Sebelum Komisi", data.summary.netBefore], ["Bersih Setelah Komisi", data.summary.netAfter]] as const).map(([label, v]) => (
                  <Card key={label}><CardContent className="py-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="mt-1 text-lg font-bold">{IDR(v)}</p>
                  </CardContent></Card>
                ))}
              </div>
            ) : data.type === "payroll" ? (
              <Card><CardContent className="py-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Gaji Dibayar (menurut tanggal bayar)</p>
                <p className="mt-1 text-lg font-bold">{IDR(data.summary.total)} <span className="text-sm font-normal text-muted-foreground">· {data.summary.count} slip · {data.summary.employeeCount} karyawan</span></p>
              </CardContent></Card>
            ) : (
              <Card><CardContent className="py-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Pembelian (diposting)</p>
                <p className="mt-1 text-lg font-bold">{IDR(data.summary.total)} <span className="text-sm font-normal text-muted-foreground">· {data.summary.count} faktur</span></p>
              </CardContent></Card>
            )}

            <Card>
              <CardContent className="p-0">
                {data.rows.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada data pada periode ini.</p>
                ) : (
                  <div className="overflow-x-auto">
                    {data.type === "revenue" ? <IncomeTable rows={data.rows} />
                      : data.type === "payroll" ? <PayrollTable rows={data.rows} />
                      : <PurchaseTable rows={data.rows} />}
                  </div>
                )}
              </CardContent>
            </Card>

            {data.type === "revenue" && (
              <p className="text-xs text-muted-foreground">
                "DP dipakai" = DP yang dipakai membayar invoice. Kotornya Rp 0 karena uang DP sudah dihitung saat dibayar;
                yang tercatat hanya potongan (PPN, Ongkos PP, bagian tim, komisi) untuk porsi DP tersebut.
              </p>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}
