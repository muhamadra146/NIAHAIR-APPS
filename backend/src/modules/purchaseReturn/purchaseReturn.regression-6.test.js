// Regression: G4-06 — items[] kosong diterima (minSize valibot hanya untuk Set/Map, bukan array)
// Found by /qa on 2026-10-15
'use strict';

const v = require('valibot');
const { createPurchaseReturnSchema } = require('./purchaseReturn.validation');

test('retur pembelian dengan items kosong ditolak', () => {
  const res = v.safeParse(createPurchaseReturnSchema, { purchaseInvoiceId: 'pi1', returnDate: '2026-10-15', items: [] });
  expect(res.success).toBe(false);
  expect(res.issues[0].message).toBe('Minimal 1 item harus ditambahkan');
});
