import type { Invoice, InvoiceLineItem } from "./types";
import { invoiceDiscountTotal } from "./discount";

// ── Rincian angka invoice yang bisa dicocokkan (FIN-023 / P6) ───────────────
//
//   Subtotal (harga × qty, sebelum diskon)
// − Diskon (diskon item + diskon membership)
// + PPN (hanya bila exclusive; inclusive = sudah termasuk dalam harga)
// = Grand Total
// − DP Diterapkan − Sudah Dibayar = Sisa Tagihan
//
// Kolom `subtotal` di database adalah DPP setelah diskon (inclusive: sudah dikeluarkan PPN-nya),
// sehingga TIDAK dipakai sebagai "Subtotal" tampilan.

/** Jumlah per baris yang ditagih: harga × qty − diskon (termasuk PPN bila inclusive) */
export const lineAmount = (item: Pick<InvoiceLineItem, "price" | "qty" | "discount">): number =>
  Number(item.price) * Number(item.qty) - Number(item.discount ?? 0);

export interface InvoiceDepositRow {
  id:     string;
  label:  string;        // "DP SID.2026.10.00006" / "DP"
  date:   string | null; // tanggal bayar DP (atau tanggal dibuat)
  amount: number;
}

export interface InvoiceBreakdown {
  subtotal:     number;
  discount:     number;
  /** PPN yang ditambahkan di atas harga (exclusive) */
  taxAdded:     number;
  /** PPN yang sudah termasuk di harga (inclusive) — hanya informasi */
  taxIncluded:  number;
  grandTotal:   number;
  deposit:      number;
  paid:         number;
  outstanding:  number;
  deposits:     InvoiceDepositRow[];
}

export function invoiceBreakdown(invoice: Invoice): InvoiceBreakdown {
  const billable = (invoice.items ?? []).filter((i) => !i.isMaterial);
  const subtotal = billable.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
  const tax      = Number(invoice.totalTax ?? 0);
  const inclusive = invoice.inclusiveTax === true;
  const deposits: InvoiceDepositRow[] = (invoice.invoiceDeposits ?? []).map((d) => ({
    id:     d.id,
    label:  d.deposit?.accurateDepositNumber ? `DP ${d.deposit.accurateDepositNumber}` : "DP",
    date:   d.deposit?.paidAt ?? d.deposit?.createdAt ?? null,
    amount: Number(d.amountApplied),
  }));
  return {
    subtotal,
    discount:    invoiceDiscountTotal(invoice),
    taxAdded:    inclusive ? 0 : tax,
    taxIncluded: inclusive ? tax : 0,
    grandTotal:  Number(invoice.grandTotal),
    deposit:     Number(invoice.totalDeposit ?? 0),
    paid:        Number(invoice.paidAmount ?? 0),
    outstanding: Number(invoice.outstandingAmount ?? 0),
    deposits,
  };
}
