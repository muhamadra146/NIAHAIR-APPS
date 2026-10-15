'use strict';

// Regression: G1-15 — POST material-usages/bulk menerima treatmentItemId (dan baris pemakaian) dari sesi lain.
// Found by /qa on 2026-10-15

jest.mock('./materialUsage.repository');
jest.mock('../inventory/inventory.service', () => ({ generateServiceMovement: jest.fn(), reverseServiceUsageMovement: jest.fn() }));
jest.mock('../invoice/invoice.sync.service', () => ({ syncInvoiceToAccurate: jest.fn() }));

const repo = require('./materialUsage.repository');
const svc  = require('./materialUsage.service');

beforeEach(() => {
  jest.clearAllMocks();
  repo.findSessionById.mockResolvedValue({ id: 'ts-A' });
  repo.findItemUnit.mockResolvedValue({ id: 'iu1' });
});

test('treatment item milik sesi lain → 404, tidak ada yang disimpan', async () => {
  repo.findTreatmentItem.mockResolvedValue({ id: 'ti-B', treatmentSessionId: 'ts-B' });
  await expect(svc.bulkSave('ts-A', [{ treatmentItemId: 'ti-B', materialItemId: 'm1', unitId: 'u1', qty: 1 }]))
    .rejects.toMatchObject({ statusCode: 404 });
  expect(repo.findOrCreateUsage).not.toHaveBeenCalled();
  expect(repo.createUsageItem).not.toHaveBeenCalled();
});

test('baris pemakaian (row.id) milik item treatment lain → 404, qty tidak diubah', async () => {
  repo.findTreatmentItem.mockResolvedValue({ id: 'ti-A', treatmentSessionId: 'ts-A' });
  repo.findUsageItemById.mockResolvedValue({ id: 'ui9', materialUsage: { treatmentItemId: 'ti-other' } });
  await expect(svc.bulkSave('ts-A', [{ id: 'ui9', treatmentItemId: 'ti-A', qty: 9 }]))
    .rejects.toMatchObject({ statusCode: 404 });
  expect(repo.updateUsageItemQty).not.toHaveBeenCalled();
});

test('baris valid kedua tidak tersimpan sebagian bila baris lain tidak valid', async () => {
  repo.findTreatmentItem
    .mockResolvedValueOnce({ id: 'ti-A', treatmentSessionId: 'ts-A' })
    .mockResolvedValueOnce({ id: 'ti-B', treatmentSessionId: 'ts-B' });
  await expect(svc.bulkSave('ts-A', [
    { treatmentItemId: 'ti-A', materialItemId: 'm1', unitId: 'u1', qty: 1 },
    { treatmentItemId: 'ti-B', materialItemId: 'm1', unitId: 'u1', qty: 1 },
  ])).rejects.toMatchObject({ statusCode: 404 });
  expect(repo.createUsageItem).not.toHaveBeenCalled();
});
