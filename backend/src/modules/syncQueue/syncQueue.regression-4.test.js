// Regression: G5-11 — POST /sync-queues menyimpan payload {} karena object({}) valibot membuang semua key
// Found by /qa on 2026-10-15
'use strict';

const v = require('valibot');
const { createSyncJobSchema } = require('./syncQueue.validation');

test('payload bebas dipertahankan apa adanya', () => {
  const out = v.parse(createSyncJobSchema, {
    entityType: 'INVOICE', direction: 'APP_TO_ACCURATE', payload: { invoiceNo: 'INV-1', nested: { a: 1 } },
  });
  expect(out.payload).toEqual({ invoiceNo: 'INV-1', nested: { a: 1 } });
});

test('payload bukan object ditolak', () => {
  const res = v.safeParse(createSyncJobSchema, { entityType: 'INVOICE', direction: 'APP_TO_ACCURATE', payload: 'x' });
  expect(res.success).toBe(false);
});
