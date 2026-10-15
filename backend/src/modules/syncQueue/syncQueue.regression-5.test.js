// Regression: G5-12 — ENTITY_TYPES di syncQueue.validation.js ketinggalan dari enum Prisma
// (DEPOSIT_PAYMENT, STOCK_TRANSFER, PURCHASE_*, PAYROLL … ditolak)
// Found by /qa on 2026-10-15
'use strict';

const v = require('valibot');
const { SyncEntityType, SyncDirection } = require('@prisma/client');
const { createSyncJobSchema, ENTITY_TYPES, DIRECTIONS } = require('./syncQueue.validation');

test('ENTITY_TYPES & DIRECTIONS sama persis dengan enum Prisma', () => {
  expect([...ENTITY_TYPES].sort()).toEqual(Object.values(SyncEntityType).sort());
  expect([...DIRECTIONS].sort()).toEqual(Object.values(SyncDirection).sort());
});

test.each(['DEPOSIT_PAYMENT', 'STOCK_TRANSFER', 'STOCK_TRANSFER_RECEIVE', 'PURCHASE_INVOICE', 'PURCHASE_RETURN', 'PAYROLL'])(
  'entityType %s diterima', (entityType) => {
    expect(v.safeParse(createSyncJobSchema, { entityType, direction: 'APP_TO_ACCURATE' }).success).toBe(true);
  },
);
