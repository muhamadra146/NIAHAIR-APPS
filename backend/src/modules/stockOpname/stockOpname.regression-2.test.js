// Regression: G4-15 — POST /stock-opnames/:id/sync → 500 menyembunyikan pesan error Accurate
// Regression: B8 — hasil opname dikirim sebagai Perintah/Hasil Stok Opname (mengunci gudang Accurate,
//   user API tak berhak membuat Hasil) → kini satu dokumen Penyesuaian Persediaan (keputusan owner 2026-10-19)
// Found by /qa on 2026-10-15 & 2026-10-18
'use strict';

jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('../branch/branch.repository', () => ({ getAccurateBranchId: jest.fn().mockResolvedValue(7) }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn((fn) => fn({ tx: true })) }));
jest.mock('./stockOpname.sync.repository', () => ({
  findOpnameForSync:          jest.fn(),
  markOpnameAdjustmentSynced: jest.fn(),
  markOpnameNoDifference:     jest.fn(),
  findAdjustmentGlAccounts:   jest.fn(),
  findGlAccountById:          jest.fn(),
  findCostPrice:              jest.fn().mockResolvedValue(1500),
  tryLockOpnameSync:          jest.fn().mockResolvedValue(true),
  findOpnameAccurateResultId: jest.fn().mockResolvedValue(null),
}));

const { accurateRequest } = require('../accurate/accurate.client');
const repo                = require('./stockOpname.sync.repository');
const { syncOpnameToAccurate } = require('./stockOpname.sync.service');

const item = (code, accurateItemId) => ({
  id: `it-${code}`, itemCode: code, accurateItemId, defaultUnit: { id: 'GRAM', accurateUnitId: 601 },
});
const line = (code, accurateItemId, qtyChange, mvId) => ({
  id: `oi-${code}`, qtyDifference: qtyChange,
  inventoryMovement: qtyChange === 0 ? null : { id: mvId, qtyChange: String(qtyChange), accurateAdjustmentId: null },
  inventory: { item: item(code, accurateItemId) },
});
const opname = (items, extra = {}) => ({
  id: 'op1', opnameNo: 'OPN-1', status: 'POSTED',
  createdAt: new Date('2026-10-04T03:00:00Z'), postedAt: new Date('2026-10-04T17:30:00Z'), // 05/10 WIB
  warehouse: { name: 'GUDANG', branchId: 'b1', accurateWarehouseId: 50 },
  accurateResultId: null, items, ...extra,
});

beforeEach(() => {
  jest.clearAllMocks();
  repo.findAdjustmentGlAccounts.mockResolvedValue([{ id: 'gl1', accurateGlAccountId: 2700 }]);
  repo.tryLockOpnameSync.mockResolvedValue(true);
  repo.findOpnameAccurateResultId.mockResolvedValue(null);
});

test('selisih dikirim sebagai SATU Penyesuaian Persediaan (IN/OUT per baris), bukan Perintah/Hasil Stok Opname', async () => {
  repo.findOpnameForSync.mockResolvedValue(opname([
    line('A', 15300, -10, 'mv1'), line('B', 15350, 4, 'mv2'), line('C', 15400, 0),
  ]));
  accurateRequest.mockResolvedValue({ s: true, r: { id: 999, number: 'IA.2026.10.00001' } });

  await expect(syncOpnameToAccurate('op1')).resolves.toMatchObject({ accurateAdjustmentId: 999, lineCount: 2 });

  expect(accurateRequest).toHaveBeenCalledTimes(1);
  const [endpoint, { body }] = accurateRequest.mock.calls[0];
  expect(endpoint).toBe('/item-adjustment/save.do');
  expect(accurateRequest.mock.calls.some(([ep]) => /stock-opname/.test(ep))).toBe(false);
  expect(body).toMatchObject({ transDate: '05/10/2026', adjustmentAccountId: 2700, branchId: 7, description: 'Stok Opname OPN-1' });
  expect(body.detailItem).toEqual([
    { itemId: 15300, quantity: 10, unitId: 601, unitPrice: 1500, warehouseId: 50, itemAdjustmentType: 'ADJUSTMENT_OUT' },
    { itemId: 15350, quantity: 4,  unitId: 601, unitPrice: 1500, warehouseId: 50, itemAdjustmentType: 'ADJUSTMENT_IN' },
  ]);
  expect(repo.markOpnameAdjustmentSynced).toHaveBeenCalledWith({
    id: 'op1', accurateAdjustmentId: 999, accurateAdjustmentNumber: 'IA.2026.10.00001',
    movementIds: ['mv1', 'mv2'], glAccountId: 'gl1',
  }, { tx: true });
});

test('Accurate menolak → 422 dengan pesan Accurate singkat, tidak ditandai tersinkron', async () => {
  repo.findOpnameForSync.mockResolvedValue(opname([line('A', 15300, -10, 'mv1')]));
  accurateRequest.mockResolvedValue({ s: false, d: ['Gudang tidak aktif'] });

  await expect(syncOpnameToAccurate('op1')).rejects.toMatchObject({
    statusCode: 422, message: expect.stringContaining('Gudang tidak aktif'),
  });
  expect(repo.markOpnameAdjustmentSynced).not.toHaveBeenCalled();
});

test('tanpa selisih → tidak ada dokumen Accurate, hanya ditandai sudah dicek', async () => {
  repo.findOpnameForSync.mockResolvedValue(opname([line('A', 15300, 0)]));
  await expect(syncOpnameToAccurate('op1')).resolves.toMatchObject({ skipped: true });
  expect(accurateRequest).not.toHaveBeenCalled();
  expect(repo.markOpnameNoDifference).toHaveBeenCalledWith('op1');
});

test('lebih dari satu akun penyesuaian & tidak dipilih → 422 minta pilih akun', async () => {
  repo.findOpnameForSync.mockResolvedValue(opname([line('A', 15300, -10, 'mv1')]));
  repo.findAdjustmentGlAccounts.mockResolvedValue([{ id: 'gl1', accurateGlAccountId: 2700 }, { id: 'gl2', accurateGlAccountId: 2750 }]);
  await expect(syncOpnameToAccurate('op1')).rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining('Pilih akun') });
  expect(accurateRequest).not.toHaveBeenCalled();
});

test('akun dipilih dipakai', async () => {
  repo.findOpnameForSync.mockResolvedValue(opname([line('A', 15300, -10, 'mv1')]));
  repo.findGlAccountById.mockResolvedValue({ id: 'gl2', usage: 'STOCK_ADJUSTMENT', isActive: true, accurateGlAccountId: 2750 });
  accurateRequest.mockResolvedValue({ s: true, r: { id: 5, number: 'IA-5' } });
  await syncOpnameToAccurate('op1', { glAccountId: 'gl2' });
  expect(accurateRequest.mock.calls[0][1].body.adjustmentAccountId).toBe(2750);
});

test('sinkron paralel (lock dipakai) → 409, Accurate tidak dipanggil', async () => {
  repo.findOpnameForSync.mockResolvedValue(opname([line('A', 15300, -10, 'mv1')]));
  repo.tryLockOpnameSync.mockResolvedValue(false);
  await expect(syncOpnameToAccurate('op1')).rejects.toMatchObject({ statusCode: 409 });
  expect(accurateRequest).not.toHaveBeenCalled();
});

test('sudah tersinkron → dilewati', async () => {
  repo.findOpnameForSync.mockResolvedValue(opname([line('A', 15300, -10, 'mv1')], { accurateResultId: 999 }));
  await expect(syncOpnameToAccurate('op1')).resolves.toMatchObject({ skipped: true });
  expect(accurateRequest).not.toHaveBeenCalled();
});

test('opname tidak ditemukan → 404', async () => {
  repo.findOpnameForSync.mockResolvedValue(null);
  await expect(syncOpnameToAccurate('x')).rejects.toMatchObject({ statusCode: 404 });
});

test('gudang belum terhubung → 422', async () => {
  repo.findOpnameForSync.mockResolvedValue(opname([line('A', 15300, -10, 'mv1')], { warehouse: { name: 'A' } }));
  await expect(syncOpnameToAccurate('op1')).rejects.toMatchObject({ statusCode: 422 });
});
