// Regression: G4-08 — retur melebihi qty dibeli (dikurangi retur POSTED sebelumnya) / item di luar faktur diterima
// Found by /qa on 2026-10-15
'use strict';

jest.mock('./purchaseReturn.repository');
jest.mock('./purchaseReturn.accurate.sync.service', () => ({ pushPurchaseReturnToAccurate: jest.fn() }));
jest.mock('../syncQueue/syncQueue.service');
jest.mock('../inventory/inventory.period.service');
jest.mock('../../config/prisma', () => ({
  purchaseInvoice:    { findUnique: jest.fn() },
  purchaseReturn:     { findFirst: jest.fn().mockResolvedValue(null) },
  purchaseReturnItem: { findMany: jest.fn() },
  itemUnit:           { findUnique: jest.fn().mockResolvedValue(null) },
  $transaction:       jest.fn(),
}));

const prisma = require('../../config/prisma');
const svc    = require('./purchaseReturn.service');

const body = (items) => ({ purchaseInvoiceId: 'pi1', returnDate: '2026-10-15', items });

beforeEach(() => {
  jest.clearAllMocks();
  prisma.purchaseInvoice.findUnique.mockResolvedValue({
    id: 'pi1', status: 'POSTED', warehouse: { id: 'wh1' },
    items: [{ itemId: 'i1', unitId: 'u1', qty: '10' }],
  });
  prisma.purchaseReturnItem.findMany.mockResolvedValue([{ itemId: 'i1', unitId: 'u1', qty: '8' }]); // sudah diretur 8
});

test('qty retur melebihi sisa (10 − 8 = 2) → 422', async () => {
  await expect(svc.createPurchaseReturn(body([{ itemId: 'i1', unitId: 'u1', qty: 3, price: 1 }])))
    .rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining('melebihi sisa') });
  expect(prisma.$transaction).not.toHaveBeenCalled();
  expect(prisma.purchaseReturnItem.findMany.mock.calls[0][0].where.purchaseReturn).toMatchObject({ purchaseInvoiceId: 'pi1', status: 'POSTED' });
});

test('item yang tidak ada di faktur → 422', async () => {
  await expect(svc.createPurchaseReturn(body([{ itemId: 'lain', unitId: 'u1', qty: 1, price: 1 }])))
    .rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining('tidak ada di faktur') });
});

test('qty dalam sisa → dibuat', async () => {
  prisma.$transaction.mockResolvedValue({ id: 'pr1' });
  await expect(svc.createPurchaseReturn(body([{ itemId: 'i1', unitId: 'u1', qty: 2, price: 1 }]))).resolves.toEqual({ id: 'pr1' });
});
