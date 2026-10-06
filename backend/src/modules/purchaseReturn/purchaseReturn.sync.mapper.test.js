'use strict';

const { mapPurchaseReturnToAccurate } = require("./purchaseReturn.sync.mapper");

// Field names diverifikasi langsung ke Accurate (purchase-return/save.do):
// returnType INVOICE = "Retur dari: Faktur", faktur dirujuk lewat invoiceId.
const RETURN = {
  returnNo:   "PR-20261004-0001",
  returnDate: new Date("2026-10-04T00:00:00.000Z"),
  notes:      "Barang rusak",
  purchaseInvoice: {
    accuratePurchaseInvoiceId: 5800,
    taxable:      false,
    inclusiveTax: false,
    supplier:     { accurateVendorId: 12001 },
  },
  items: [
    { qty: "1", price: "50000", discount: "0",  item: { accurateItemId: 900 }, unit: { accurateUnitId: 77, name: "BOTOL" } },
    { qty: "2", price: "10000", discount: "10", item: { accurateItemId: 901 }, unit: { accurateUnitId: null, name: "PCS" } },
    { qty: "1", price: "5000",  discount: "0",  item: { accurateItemId: null }, unit: { accurateUnitId: null, name: "PCS" } },
  ],
};

describe("mapPurchaseReturnToAccurate", () => {
  test("retur dari faktur: returnType INVOICE + invoiceId faktur induk", () => {
    const p = mapPurchaseReturnToAccurate(RETURN, 50);
    expect(p).toMatchObject({
      vendorId:   12001,
      returnType: "INVOICE",
      invoiceId:  5800,
      transDate:  "04/10/2026",
      number:     "PR-20261004-0001",
      description:"Barang rusak",
      branchId:   50,
    });
    // Accurate mengabaikan purchaseInvoiceId → "No Faktur harus diisi"
    expect(p).not.toHaveProperty("purchaseInvoiceId");
  });

  test("detail: hanya barang tersinkron, satuan via id atau nama, diskon per item", () => {
    const { detailItem } = mapPurchaseReturnToAccurate(RETURN);
    expect(detailItem).toEqual([
      { itemId: 900, quantity: 1, unitPrice: 50000, itemUnitId: 77 },
      { itemId: 901, quantity: 2, unitPrice: 10000, unitName: "PCS", itemDiscPercent: 10 },
    ]);
  });

  test("tanpa cabang Accurate: branchId tidak dikirim", () => {
    expect(mapPurchaseReturnToAccurate(RETURN, null)).not.toHaveProperty("branchId");
  });
});
