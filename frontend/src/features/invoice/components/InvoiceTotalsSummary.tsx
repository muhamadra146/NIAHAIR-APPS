import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice } from "../types";
import { invoiceBreakdown } from "../totals";

/**
 * Ringkasan angka invoice yang bisa dicocokkan (FIN-023 / P6):
 * Subtotal − Diskon + PPN = Grand Total; − DP (nomor + tanggal) − Sudah Dibayar = Sisa Tagihan.
 * Dipakai di tab Invoice pada detail Booking.
 */
export function InvoiceTotalsSummary({ invoice }: { invoice: Invoice }) {
  const t = invoiceBreakdown(invoice);
  const Row = ({ label, value, cls = "" }: { label: string; value: string; cls?: string }) => (
    <div className={`flex items-center justify-between gap-3 px-3 py-2 ${cls}`}>
      <span className={cls ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums whitespace-nowrap">{value}</span>
    </div>
  );
  return (
    <div className="rounded-md border border-border divide-y divide-border text-sm">
      <Row label="Subtotal" value={formatCurrency(t.subtotal)} />
      {t.discount > 0 && <Row label="Diskon" value={`− ${formatCurrency(t.discount)}`} cls="text-red-600" />}
      {t.taxAdded > 0 && <Row label="PPN 11%" value={`+ ${formatCurrency(t.taxAdded)}`} />}
      <Row label="Grand Total" value={formatCurrency(t.grandTotal)} cls="font-semibold" />
      {t.taxIncluded > 0 && (
        <p className="px-3 py-1.5 text-right text-[11px] text-muted-foreground">termasuk PPN {formatCurrency(t.taxIncluded)}</p>
      )}
      {t.deposits.map((d) => (
        <Row key={d.id} label={`${d.label}${d.date ? ` (${formatDate(d.date)})` : ""}`} value={`− ${formatCurrency(d.amount)}`} cls="text-green-700" />
      ))}
      {t.paid > 0 && <Row label="Sudah Dibayar" value={`− ${formatCurrency(t.paid)}`} cls="text-green-700" />}
      <Row
        label="Sisa Tagihan"
        value={formatCurrency(t.outstanding)}
        cls={`font-semibold ${t.outstanding > 0 ? "text-red-600" : "text-green-600"}`}
      />
    </div>
  );
}
