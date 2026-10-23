import { describe, it, expect } from "vitest";
import { itemDiscountParts, invoiceDiscountSummary, invoiceDiscountTotal, discountText, isMemberDiscountEligible, posMembershipPercentTotal, effectiveLineDiscount, type PosDiscountLine } from "./discount";
import type { Invoice, InvoiceLineItem } from "./types";

// Requirement Finance #2: teks diskon "Diskon 10% Rp 50.000" & jenis diskon dibedakan

const SERVICE = { id: "i1", name: "Layanan", itemCode: "L1", itemType: "SERVICE", categoryId: "jasa", excludeMemberDiscount: false, category: { parentId: null } };

const inv = (over: Partial<Invoice>): Invoice =>
  ({ totalDiscount: "0", membershipDiscountTotal: "0", membership: null, ...over }) as Invoice;

const line = (over: Partial<InvoiceLineItem>): InvoiceLineItem =>
  ({ price: "500000", qty: "1", discount: "0", discountType: "AMOUNT", discountPercent: null, item: SERVICE, ...over }) as InvoiceLineItem;

const GOLD = { id: "m1", name: "Gold", discountType: "PERCENTAGE" as const, discountValue: "5", discountCategories: [{ categoryId: "jasa" }] };

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

  // CRM-014 (keputusan owner 2026-10-23): yang lebih besar dipakai, tidak ditumpuk
  it("diskon nominal lebih besar dari membership → seluruhnya diskon item", () => {
    const parts = itemDiscountParts(
      line({ discount: "45000" }),
      inv({ totalDiscount: "45000", membershipDiscountTotal: "25000", membership: GOLD }),
    );
    expect(parts.map(discountText)).toEqual(["Diskon Rp 45.000"]);
  });

  it("membership lebih besar dari diskon nominal → seluruhnya diskon membership", () => {
    const parts = itemDiscountParts(
      line({ discount: "25000" }),
      inv({ totalDiscount: "25000", membershipDiscountTotal: "25000", membership: GOLD }),
    );
    expect(parts.map(discountText)).toEqual(["Diskon Membership Gold 5% Rp 25.000"]);
  });

  it("membership persen tidak berlaku untuk item yang kategorinya tidak dicentang di paket", () => {
    const product = { ...SERVICE, itemType: "INVENTORY", categoryId: "vip", category: { parentId: "rambut" } };
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

// Diskon membership per kategori (keputusan user 2026-10-14)
describe("isMemberDiscountEligible", () => {
  const PLATINUM = { discountCategories: [{ categoryId: "jasa" }, { categoryId: "rambut" }] };
  const rambutVip = { categoryId: "vip", excludeMemberDiscount: false, category: { parentId: "rambut" } };
  const ongkosPP  = { categoryId: "jasa", excludeMemberDiscount: true, category: { parentId: null } };

  it("kategori induk mencakup sub-kategori; item dikecualikan & bahan baku tidak dapat diskon", () => {
    expect(isMemberDiscountEligible(SERVICE, GOLD)).toBe(true);
    expect(isMemberDiscountEligible(rambutVip, GOLD)).toBe(false);
    expect(isMemberDiscountEligible(rambutVip, PLATINUM)).toBe(true);
    expect(isMemberDiscountEligible(ongkosPP, PLATINUM)).toBe(false);
    expect(isMemberDiscountEligible(SERVICE, PLATINUM, true)).toBe(false);
  });

  // Regression QA membership 2026-10-23: invoice dari POS menyimpan persen membership sebagai persen baris
  it("baris POS 10% pada invoice Gold 10% → tampil sebagai Diskon Membership, bukan diskon item", () => {
    const GOLD10 = { ...GOLD, discountValue: "10" };
    const parts = itemDiscountParts(
      line({ price: "250000", qty: "2", discount: "50000", discountType: "PERCENT", discountPercent: "10" }),
      inv({ totalDiscount: "50000", membershipDiscountTotal: "50000", membership: GOLD10 }),
    );
    expect(parts.map(discountText)).toEqual(["Diskon Membership Gold 10% Rp 50.000"]);
  });

  it("manual 20% lebih besar dari Gold 10% → seluruhnya diskon item 20%", () => {
    const GOLD10 = { ...GOLD, discountValue: "10" };
    const parts = itemDiscountParts(
      line({ price: "250000", qty: "2", discount: "100000", discountType: "PERCENT", discountPercent: "20" }),
      inv({ totalDiscount: "100000", membershipDiscountTotal: "0", membership: GOLD10 }),
    );
    expect(parts.map(discountText)).toEqual(["Diskon 20% Rp 100.000"]);
  });

  it("manual 5% lebih kecil dari Gold 10% → diskon membership 10% (input 5% tetap tersimpan)", () => {
    const GOLD10 = { ...GOLD, discountValue: "10" };
    const parts = itemDiscountParts(
      line({ price: "250000", qty: "2", discount: "50000", discountType: "PERCENT", discountPercent: "5" }),
      inv({ totalDiscount: "50000", membershipDiscountTotal: "50000", membership: GOLD10 }),
    );
    expect(parts.map(discountText)).toEqual(["Diskon Membership Gold 10% Rp 50.000"]);
  });

  it("diskon nominal pada item dikecualikan tidak dibaca sebagai diskon membership", () => {
    const parts = itemDiscountParts(
      line({ discount: "25000", item: { ...SERVICE, excludeMemberDiscount: true } }),
      inv({ totalDiscount: "25000", membershipDiscountTotal: "10000", membership: GOLD }),
    );
    expect(parts.map(discountText)).toEqual(["Diskon Rp 25.000"]);
  });
});

describe("effectiveLineDiscount / posMembershipPercentTotal — yang lebih besar (CRM-014)", () => {
  const GOLD10 = { ...GOLD, discountValue: "10" };
  const jasa  = { categoryId: "jasa", excludeMemberDiscount: false, category: { parentId: null } };
  const pos = (over: Partial<PosDiscountLine>): PosDiscountLine =>
    ({ price: "250000", qty: "2", discount: "0", discountType: "AMOUNT", isMaterial: false, memberItem: jasa, ...over });

  it.each([
    ["tanpa diskon manual → member 10%", {}, 50000, 50000],
    ["manual 20% > member 10% → manual", { discountType: "PERCENT" as const, discount: "20" }, 100000, 0],
    ["manual 5% < member 10% → member", { discountType: "PERCENT" as const, discount: "5" }, 50000, 50000],
    ["manual 10% = member 10% → member", { discountType: "PERCENT" as const, discount: "10" }, 50000, 50000],
    ["nominal 30rb < member 50rb → member", { discount: "30000" }, 50000, 50000],
    ["nominal 80rb > member 50rb → manual", { discount: "80000" }, 80000, 0],
  ])("%s", (_l, over, discount, memberShare) => {
    const r = effectiveLineDiscount(pos(over), GOLD10);
    expect(r.discount).toBe(discount);
    expect(r.memberShare).toBe(memberShare);
    expect(posMembershipPercentTotal([pos(over)], GOLD10)).toBe(memberShare);
  });

  it("membership dimatikan / bahan baku / item dikecualikan → hanya diskon manual", () => {
    expect(effectiveLineDiscount(pos({ discount: "30000" }), null).discount).toBe(30000);
    expect(effectiveLineDiscount(pos({ isMaterial: true }), GOLD10).discount).toBe(0);
    expect(effectiveLineDiscount(pos({ memberItem: { ...jasa, excludeMemberDiscount: true }, discount: "1000" }), GOLD10))
      .toEqual({ discount: 1000, memberShare: 0, manual: 1000, member: 0 });
  });
});
