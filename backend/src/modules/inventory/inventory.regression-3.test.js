// Regression: G4-06 — adjust-batch & opening-balance dengan items[] kosong diterima (minSize bukan untuk array)
// Found by /qa on 2026-10-15
'use strict';

const v = require('valibot');
const { batchStockAdjustmentSchema, openingBalanceSchema } = require('./inventory.validation');

test('adjust-batch dengan items kosong ditolak', () => {
  const res = v.safeParse(batchStockAdjustmentSchema, { glAccountId: 'g1', reason: 'koreksi', items: [] });
  expect(res.success).toBe(false);
  expect(res.issues[0].message).toBe('Minimal 1 item harus ditambahkan');
});

test('opening-balance dengan items kosong ditolak', () => {
  const res = v.safeParse(openingBalanceSchema, { warehouseId: 'wh1', items: [] });
  expect(res.success).toBe(false);
  expect(res.issues[0].message).toBe('Minimal 1 item harus diisi');
});
