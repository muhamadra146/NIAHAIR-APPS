// Regression: G4-06 — faktur pembelian dengan items[] kosong diterima (dibuat POSTED tanpa item)
// Found by /qa on 2026-10-15
'use strict';

const v = require('valibot');
const { createPurchaseInvoiceSchema, updatePurchaseInvoiceSchema } = require('./purchase.validation');

test('create dengan items kosong ditolak', () => {
  const res = v.safeParse(createPurchaseInvoiceSchema, {
    supplierId: 's1', warehouseId: 'wh1', invoiceDate: '2026-10-15', items: [],
  });
  expect(res.success).toBe(false);
  expect(res.issues.map((i) => i.message)).toContain('Minimal 1 item harus ditambahkan');
});

test('update dengan items kosong ditolak', () => {
  const res = v.safeParse(updatePurchaseInvoiceSchema, { items: [] });
  expect(res.success).toBe(false);
});
