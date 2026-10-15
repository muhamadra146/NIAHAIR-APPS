// Regression: G4-09 — batal/hapus faktur yang punya retur POSTED membalik qty penuh (stok keluar dobel)
// Found by /qa on 2026-10-15
'use strict';

jest.mock('./purchase.repository');
jest.mock('../syncQueue/syncQueue.service');
jest.mock('../../workers/accurateSync.worker', () => ({ processSyncQueue: jest.fn() }));
jest.mock('../inventory/inventory.period.service');
jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('../../config/prisma', () => ({
  purchaseReturn: { count: jest.fn() },
  $transaction:   jest.fn(),
}));

const repo   = require('./purchase.repository');
const prisma = require('../../config/prisma');
const { accurateRequest } = require('../accurate/accurate.client');
const svc    = require('./purchase.service');

const INVOICE = {
  id: 'pi1', invoiceNo: 'PI-1', status: 'POSTED', warehouseId: 'wh1', invoiceDate: '2026-10-15',
  accuratePurchaseInvoiceId: 123, items: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  repo.findPurchaseInvoiceById.mockResolvedValue(INVOICE);
  prisma.purchaseReturn.count.mockResolvedValue(1);
});

test('cancel faktur dengan retur POSTED → 422 sebelum void Accurate', async () => {
  await expect(svc.cancelPurchaseInvoice('pi1')).rejects.toMatchObject({ statusCode: 422 });
  expect(prisma.purchaseReturn.count).toHaveBeenCalledWith({ where: { purchaseInvoiceId: 'pi1', status: 'POSTED' } });
  expect(accurateRequest).not.toHaveBeenCalled();
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

test('delete faktur dengan retur POSTED → 422 sebelum hapus Accurate', async () => {
  await expect(svc.deletePurchaseInvoice('pi1')).rejects.toMatchObject({ statusCode: 422 });
  expect(accurateRequest).not.toHaveBeenCalled();
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

test('cancel paralel (faktur sudah tidak POSTED di dalam tx) → 409', async () => {
  prisma.purchaseReturn.count.mockResolvedValue(0);
  repo.findPurchaseInvoiceById.mockResolvedValue({ ...INVOICE, accuratePurchaseInvoiceId: null });
  const tx = { purchaseInvoice: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) }, inventoryMovement: { create: jest.fn() } };
  prisma.$transaction.mockImplementation((fn) => fn(tx));
  await expect(svc.cancelPurchaseInvoice('pi1')).rejects.toMatchObject({ statusCode: 409 });
  expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
});
