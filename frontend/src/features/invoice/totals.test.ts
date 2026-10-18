import { describe, it, expect } from "vitest";
import { documentTax, invoiceBreakdown, lineAmount } from "./totals";
import type { Invoice, InvoiceLineItem } from "./types";

// P6 (QA POS 2026-10-17): Subtotal − Diskon + PPN harus = Grand Total; DP tampil dengan nomor DP

const line = (over: Partial<InvoiceLineItem>): InvoiceLineItem =>
  ({ price: "500000", qty: "1", discount: "0", discountType: "AMOUNT", discountPercent: null, isMaterial: false, ...over }) as InvoiceLineItem;

const inv = (over: Partial<Invoice>): Invoice =>
  ({ totalDiscount: "0", membershipDiscountTotal: "0", membership: null, totalTax: "0", totalDeposit: "0", paidAmount: "0",
     inclusiveTax: false, taxable: false, items: [], invoiceDeposits: [], ...over }) as Invoice;

const reconciles = (b: ReturnType<typeof invoiceBreakdown>) =>
  Math.round((b.subtotal - b.discount + b.taxAdded) * 100) / 100 === b.grandTotal;

describe("invoiceBreakdown", () => {
  it("diskon item: subtotal kotor, bukan subtotal setelah diskon", () => {
    const b = invoiceBreakdown(inv({
      items: [line({ discount: "50000", subtotal: "450000" })],
      subtotal: "450000", totalDiscount: "50000", grandTotal: "450000", outstandingAmount: "450000",
    }));
    expect(b.subtotal).toBe(500000);
    expect(b.discount).toBe(50000);
    expect(reconciles(b)).toBe(true);
  });

  it("PPN exclusive ditambahkan", () => {
    const b = invoiceBreakdown(inv({
      taxable: true, items: [line({ price: "700000", discount: "100000", subtotal: "600000" })],
      totalDiscount: "100000", totalTax: "66000", grandTotal: "666000", outstandingAmount: "666000",
    }));
    expect(b.taxAdded).toBe(66000);
    expect(reconciles(b)).toBe(true);
  });

  it("PPN inclusive hanya informasi (sudah termasuk harga)", () => {
    const b = invoiceBreakdown(inv({
      taxable: true, inclusiveTax: true,
      items: [line({ price: "11600000", discount: "5602800", subtotal: "5402882.88" })],
      totalDiscount: "5602800", totalTax: "594317.12", grandTotal: "5997200", totalDeposit: "500000", outstandingAmount: "5497200",
      invoiceDeposits: [{ id: "x", depositId: "d1", amountApplied: "500000", deposit: { id: "d1", amount: "500000", accurateDepositNumber: "SID.2026.10.00006", paidAt: "2026-10-08T04:00:00Z" } }],
    }));
    expect(b.taxAdded).toBe(0);
    expect(b.taxIncluded).toBe(594317.12);
    expect(reconciles(b)).toBe(true);
    expect(b.deposits[0]).toMatchObject({ label: "DP SID.2026.10.00006", amount: 500000, date: "2026-10-08T04:00:00Z" });
  });

  it("membership nominal ikut di diskon; bahan baku tidak dihitung", () => {
    const b = invoiceBreakdown(inv({
      items: [line({}), line({ isMaterial: true, price: "20000" })],
      membershipDiscountTotal: "30000", membership: { id: "m", name: "Gold", discountType: "FIXED_AMOUNT", discountValue: "30000", discountCategories: [] },
      grandTotal: "470000", outstandingAmount: "470000",
    }));
    expect(b.subtotal).toBe(500000);
    expect(b.discount).toBe(30000);
    expect(reconciles(b)).toBe(true);
  });

  it("lineAmount = harga × qty − diskon", () => {
    expect(lineAmount({ price: "100000", qty: "3", discount: "25000" })).toBe(275000);
  });
});

// Keputusan user 2026-10-17: PPN dibulatkan ke rupiah penuh mengikuti Accurate (sama dengan backend)
describe("documentTax", () => {
  it.each([
    [143888.37, false, 15828],   // ERP lama 159.716,09 → Accurate 159.716,37
    [139992,    false, 15399],   // ERP lama 155.391,12 → Accurate 155.391
    [13650,     false, 1502],    // tepat setengah (1.501,5) → ke atas
    [20008,     false, 2201],    // per dokumen, bukan Σ per baris (2.200,88)
    [7700000,   true,  763063],  // inclusive
    [5997200,   true,  594317],
    [0,         false, 0],
  ])("dasar %d inclusive=%s → %d", (base, inclusive, expected) => {
    expect(documentTax(base, inclusive)).toBe(expected);
  });
});
