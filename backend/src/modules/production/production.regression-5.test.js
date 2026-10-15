// Regression: G4-16 — sync production order yang tidak ada / masih DRAFT → 500
// Found by /qa on 2026-10-15
'use strict';

jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('../branch/branch.repository', () => ({ getAccurateBranchId: jest.fn() }));
jest.mock('./production.sync.repository', () => ({
  findProductionForSync:  jest.fn(),
  markPekerjaanSynced:    jest.fn(),
  markPenyelesaianSynced: jest.fn(),
}));

const { findProductionForSync } = require('./production.sync.repository');
const { syncProductionToAccurate } = require('./production.sync.service');

beforeEach(() => jest.clearAllMocks());

test('order tidak ditemukan → 404', async () => {
  findProductionForSync.mockResolvedValue(null);
  await expect(syncProductionToAccurate('x')).rejects.toMatchObject({ statusCode: 404 });
});

test('order DRAFT → 422 dengan pesan jelas', async () => {
  findProductionForSync.mockResolvedValue({ id: 'po1', status: 'DRAFT' });
  await expect(syncProductionToAccurate('po1')).rejects.toMatchObject({
    statusCode: 422, message: expect.stringContaining('COMPLETED'),
  });
});

test('gudang belum terhubung Accurate → 422', async () => {
  findProductionForSync.mockResolvedValue({ id: 'po1', status: 'COMPLETED', warehouse: { name: 'A' } });
  await expect(syncProductionToAccurate('po1')).rejects.toMatchObject({ statusCode: 422 });
});
