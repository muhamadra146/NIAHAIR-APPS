// Regression: B9 — satuan tak terdaftar di item_units diam-diam dianggap faktor 1 (stok salah hitung)
// Regression: B4 — klik ganda penyesuaian stok membuat penyesuaian kedua dengan selisih 0
// Found by /qa on 2026-10-18
'use strict';

jest.mock('./inventory.repository');
jest.mock('./inventory.period.service');
jest.mock('./inventory.adjustment.sync.service', () => ({ pushAdjustmentToAccurate: jest.fn() }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));

const prisma = require('../../config/prisma');
const { toBaseQty } = require('./inventory.conversion');
const svc = require('./inventory.service');
const { accurateReason } = jest.requireActual('./inventory.adjustment.sync.service');

const client = (itemUnit, item) => ({
  itemUnit: { findUnique: jest.fn().mockResolvedValue(itemUnit) },
  item:     { findUnique: jest.fn().mockResolvedValue(item) },
});

describe('toBaseQty', () => {
  test('satuan terdaftar → qty × faktor', async () => {
    expect((await toBaseQty(client({ conversionFactor: '80' }), 'i1', 'TUBE', 2)).toString()).toBe('160');
  });
  test('satuan dasar item tanpa baris item_units → faktor 1', async () => {
    expect((await toBaseQty(client(null, { name: 'Cat', defaultUnitId: 'GRAM' }), 'i1', 'GRAM', 5)).toString()).toBe('5');
  });
  test('satuan lain yang tidak terdaftar → 422 (bukan faktor 1)', async () => {
    await expect(toBaseQty(client(null, { name: 'Cat', defaultUnitId: 'GRAM' }), 'i1', 'PCS', 5))
      .rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining('Satuan tidak terdaftar untuk item "Cat"') });
  });
});

describe('penyesuaian stok', () => {
  test('qty aktual = stok sistem (klik ganda) → 422 "Tidak ada selisih stok", tidak ada movement', async () => {
    const tx = {
      inventory:         { findUnique: jest.fn().mockResolvedValue({ id: 'inv1', qtyOnHand: '90', qtyReserved: '0', warehouseId: 'wh1' }), updateMany: jest.fn() },
      inventoryMovement: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation((fn) => fn(tx));
    await expect(svc.createStockAdjustment('inv1', { qtyActual: 90, reason: 'Koreksi', glAccountId: 'gl1' }))
      .rejects.toMatchObject({ statusCode: 422, message: 'Tidak ada selisih stok' });
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
    expect(tx.inventory.updateMany).not.toHaveBeenCalled();
  });

  test('batch: semua baris tanpa selisih → 422', async () => {
    const tx = {
      inventory:         { findUnique: jest.fn().mockResolvedValue({ id: 'inv1', qtyOnHand: '5', qtyReserved: '0', warehouseId: 'wh1' }), updateMany: jest.fn() },
      inventoryMovement: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation((fn) => fn(tx));
    await expect(svc.createBatchStockAdjustment({ glAccountId: 'gl1', reason: 'Koreksi', items: [{ inventoryId: 'inv1', qtyActual: 5 }] }))
      .rejects.toMatchObject({ statusCode: 422, message: 'Tidak ada selisih stok' });
  });
});

test('pesan error Accurate penyesuaian singkat, tanpa JSON mentah', () => {
  expect(accurateReason({ s: false, d: ['Kuantitas <b>tidak cukup</b>'] })).toBe('Kuantitas tidak cukup');
  expect(accurateReason({ s: false })).toBe('Accurate menolak dokumen');
});
