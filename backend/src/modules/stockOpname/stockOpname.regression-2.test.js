// Regression: G4-15 — POST /stock-opnames/:id/sync → 500 menyembunyikan pesan error Accurate
// Found by /qa on 2026-10-15
'use strict';

jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('../branch/branch.repository', () => ({ getAccurateBranchId: jest.fn().mockResolvedValue(null) }));
jest.mock('./stockOpname.sync.mapper', () => ({ mapOpnameOrderToAccurate: jest.fn(() => ({})), mapOpnameResultToAccurate: jest.fn(() => ({})) }));
jest.mock('./stockOpname.sync.repository', () => ({
  findOpnameForSync:      jest.fn(),
  markOpnameOrderSynced:  jest.fn(),
  markOpnameResultSynced: jest.fn(),
}));

const { accurateRequest }   = require('../accurate/accurate.client');
const { findOpnameForSync } = require('./stockOpname.sync.repository');
const { syncOpnameToAccurate } = require('./stockOpname.sync.service');

beforeEach(() => jest.clearAllMocks());

test('Accurate menolak Perintah SO → 422 dengan pesan Accurate', async () => {
  findOpnameForSync.mockResolvedValue({ id: 'op1', status: 'POSTED', warehouse: { accurateWarehouseId: 1 }, items: [] });
  accurateRequest.mockResolvedValue({ s: false, d: ['Gudang tidak aktif'] });

  await expect(syncOpnameToAccurate('op1')).rejects.toMatchObject({
    statusCode: 422, message: expect.stringContaining('Gudang tidak aktif'),
  });
});

test('opname tidak ditemukan → 404', async () => {
  findOpnameForSync.mockResolvedValue(null);
  await expect(syncOpnameToAccurate('x')).rejects.toMatchObject({ statusCode: 404 });
});

test('gudang belum terhubung → 422', async () => {
  findOpnameForSync.mockResolvedValue({ id: 'op1', status: 'POSTED', warehouse: { name: 'A' }, items: [] });
  await expect(syncOpnameToAccurate('op1')).rejects.toMatchObject({ statusCode: 422 });
});
