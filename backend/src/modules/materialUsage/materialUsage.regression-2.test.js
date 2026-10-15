'use strict';

// Regression: G1-21 — material-usages/bulk: baris baru tanpa materialItemId → 500;
// materialItemId UUID nol (tidak ada) → 409.
// Found by /qa on 2026-10-15

jest.mock('./materialUsage.repository');
jest.mock('../inventory/inventory.service', () => ({ generateServiceMovement: jest.fn(), reverseServiceUsageMovement: jest.fn() }));
jest.mock('../invoice/invoice.sync.service', () => ({ syncInvoiceToAccurate: jest.fn() }));

const repo = require('./materialUsage.repository');
const svc  = require('./materialUsage.service');

beforeEach(() => {
  jest.clearAllMocks();
  repo.findSessionById.mockResolvedValue({ id: 'ts1' });
  repo.findTreatmentItem.mockResolvedValue({ id: 'ti1', treatmentSessionId: 'ts1' });
});

test('baris baru tanpa materialItemId → 422 jelas', async () => {
  await expect(svc.bulkSave('ts1', [{ treatmentItemId: 'ti1', unitId: 'u1', qty: 1 }]))
    .rejects.toMatchObject({ statusCode: 422, message: 'Bahan dan satuan wajib dipilih' });
  expect(repo.createUsageItem).not.toHaveBeenCalled();
});

test('baris baru tanpa unitId → 422', async () => {
  await expect(svc.bulkSave('ts1', [{ treatmentItemId: 'ti1', materialItemId: 'm1', qty: 1 }]))
    .rejects.toMatchObject({ statusCode: 422 });
});

test('bahan/satuan tidak ada → 422 (bukan 409 FK)', async () => {
  repo.findItemUnit.mockResolvedValue(null);
  await expect(svc.bulkSave('ts1', [{ treatmentItemId: 'ti1', materialItemId: '00000000-0000-0000-0000-000000000000', unitId: 'u1', qty: 1 }]))
    .rejects.toMatchObject({ statusCode: 422, message: 'Bahan atau satuan tidak valid' });
  expect(repo.createUsageItem).not.toHaveBeenCalled();
});
