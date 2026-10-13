import { describe, it, expect } from "vitest";
import { itemDiscountParts, invoiceDiscountSummary, invoiceDiscountTotal, discountText } from "./discount";
import type { Invoice, InvoiceLineItem } from "./types";

// Requirement Finance #2: teks diskon "Diskon 10% Rp 50.000" & jenis diskon dibedakan

const SERVICE = { id: "i1", name: "Layanan", itemCode: "L1", itemType: "SERVICE" };

const inv = (over: Partial<Invoice>): Invoice =>
  ({ totalDiscount: "0", membershipDiscountTotal: "0", membership: null, ...over }) as Invoice;

const line = (over: Partial<InvoiceLineItem>): InvoiceLineItem =>
  ({ price: "500000", qty: "1", discount: "0", discountType: "AMOUNT", discountPercent: null, item: SERVICE, ...over }) as InvoiceLineItem;

const GOLD = { id: "m1", name: "Gold", discountType: "PERCENTAGE" as const, discountValue: "5" };

describe("itemDiscountParts", () => {
  it("diskon persen → 'Diskon 10% Rp 50.000'", () => {
    const parts = itemDiscountParts(line({ discount: "50000", discountType: "PERCENT", discountPercent: "10" }), inv({ totalDiscount: "50000" }));
    expect(parts.map(discountText)).toEqual(["Diskon 10% Rp 50.000"]);
  });

  it("diskon nominal → 'Diskon Rp 25.000'", () => {
    const parts = itemDiscountParts(line({ price: "300000", discount: "25000" }), inv({ totalDiscount: "25000" }));
    expect(parts.map(discountText)).toEqual(["Diskon Rp 25.000"]);
  });

  it("diskon item + membership persen dipisah", () => {
    const parts = itemDiscountParts(
      line({ discount: "75000", discountType: "PERCENT", discountPercent: "10" }),
      inv({ totalDiscount: "75000", membershipDiscountTotal: "25000", membership: GOLD }),
    );
    expect(parts.map(discountText)).toEqual(["Diskon 10% Rp 50.000", "Diskon Membership Gold 5% Rp 25.000"]);
    expect(parts.map((p) => p.kind)).toEqual(["item", "membership"]);
  });

  it("diskon nominal + membership persen dipisah", () => {
    const parts = itemDiscountParts(
      line({ discount: "45000" }),
      inv({ totalDiscount: "45000", membershipDiscountTotal: "25000", membership: GOLD }),
    );
    expect(parts.map(discountText)).toEqual(["Diskon Rp 20.000", "Diskon Membership Gold 5% Rp 25.000"]);
  });

  it("membership persen tidak berlaku untuk produk", () => {
    const product = { ...SERVICE, itemType: "INVENTORY" };
    const parts = itemDiscountParts(line({ discount: "10000", item: product }), inv({ totalDiscount: "10000", membershipDiscountTotal: "25000", membership: GOLD }));
    expect(parts.map(discountText)).toEqual(["Diskon Rp 10.000"]);
  });

  it("tanpa diskon → kosong", () => {
    expect(itemDiscountParts(line({}), inv({}))).toEqual([]);
  });
});

describe("invoiceDiscountSummary", () => {
  it("membership nominal tampil terpisah (tidak termasuk totalDiscount)", () => {
    const invoice = inv({
      totalDiscount: "0", membershipDiscountTotal: "100000",
      membership: { id: "m2", name: "Silver", discountType: "FIXED_AMOUNT", discountValue: "100000" },
    });
    expect(invoiceDiscountSummary(invoice).map(discountText)).toEqual(["Diskon Membership Silver Rp 100.000"]);
    expect(invoiceDiscountTotal(invoice)).toBe(100000);
  });

  it("membership persen dikeluarkan dari Diskon Item", () => {
    const invoice = inv({ totalDiscount: "75000", membershipDiscountTotal: "25000", membership: GOLD });
    expect(invoiceDiscountSummary(invoice).map(discountText)).toEqual([
      "Diskon Item Rp 50.000",
      "Diskon Membership Gold 5% Rp 25.000",
    ]);
    expect(invoiceDiscountTotal(invoice)).toBe(75000);
  });
});
