'use strict';

const { resolveInvoiceStatus, OPEN_INVOICE_STATUSES } = require("./invoice.status");

describe("resolveInvoiceStatus (FIN-015)", () => {
  test("belum ada uang masuk → UNPAID", () => {
    expect(resolveInvoiceStatus(1443500, 0)).toBe("UNPAID");
  });

  test("dibayar sebagian → PARTIAL", () => {
    expect(resolveInvoiceStatus(943500, 500000)).toBe("PARTIAL");
  });

  test("deposit menutup sebagian → PARTIAL", () => {
    expect(resolveInvoiceStatus("1000000", "200000")).toBe("PARTIAL");
  });

  test("sisa 0 atau lebih bayar → PAID", () => {
    expect(resolveInvoiceStatus(0, 1443500)).toBe("PAID");
    expect(resolveInvoiceStatus(-1000, 1444500)).toBe("PAID");
  });

  test("hapus semua pembayaran → kembali UNPAID", () => {
    expect(resolveInvoiceStatus(1443500, "0")).toBe("UNPAID");
  });

  test("status terbuka = UNPAID + PARTIAL", () => {
    expect(OPEN_INVOICE_STATUSES).toEqual(["UNPAID", "PARTIAL"]);
  });
});
