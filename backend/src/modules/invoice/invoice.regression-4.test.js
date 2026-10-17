'use strict';

// Regression: G1-06 — membatalkan invoice yang sudah tersinkron ke Accurate tidak menghapus fakturnya
// di Accurate; job sync tertunda juga masih bisa mengirim invoice batal ke Accurate.
// Found by /qa on 2026-10-15

jest.mock('./invoice.repository', () => ({
  findById:                   jest.fn(),
  cancelWithTransaction:      jest.fn().mockResolvedValue({ id: 'inv1', status: 'CANCELLED' }),
  markInvoiceAccurateRemoved: jest.fn(),
  countPaymentsByInvoice:     jest.fn().mockResolvedValue(0),
}));
jest.mock('./invoice.sync.repository', () => ({
  findInvoiceForSync: jest.fn(), markInvoiceSynced: jest.fn(), markInvoiceItemSynced: jest.fn(),
}));
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));
jest.mock('../inventory/inventory.service', () => ({
  generateSaleMovement: jest.fn(), reverseInvoiceSaleMovements: jest.fn(), reverseInvoiceServiceMovements: jest.fn(),
}));
jest.mock('../inventory/inventory.repository', () => ({ findWarehouseByBranchId: jest.fn() }));
jest.mock('../branch/branch.repository', () => ({ getAccurateBranchId: jest.fn() }));
jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('./invoice.workflow', () => ({ handleInvoicePaid: jest.fn() }));
jest.mock('../membership/membership.service', () => ({ getActiveMembership: jest.fn() }));
jest.mock('../consultation/consultation.repository', () => ({ findByInvoiceId: jest.fn(), buildFirstInvoiceMap: jest.fn() }));
jest.mock('../treatment/treatmentJobAssignment.repository', () => ({ upsertMany: jest.fn() }));
jest.mock('../../config/prisma', () => ({}));

const repo     = require('./invoice.repository');
const syncRepo = require('./invoice.sync.repository');
const { accurateRequest } = require('../accurate/accurate.client');
const { cancelInvoice }   = require('./invoice.service');
const { syncInvoiceToAccurate } = require('./invoice.sync.service');

const INVOICE = { id: 'inv1', invoiceNo: 'INV-1', status: 'UNPAID', grandTotal: '100000', paidAmount: '0', accurateInvoiceId: 777 };

beforeEach(() => jest.clearAllMocks());

test('cancel invoice tersinkron → faktur Accurate dihapus & referensi dilepas', async () => {
  repo.findById.mockResolvedValue(INVOICE);
  accurateRequest.mockResolvedValue({ s: true });

  await cancelInvoice('inv1', 'u1');

  expect(accurateRequest).toHaveBeenCalledWith('/sales-invoice/delete.do', { method: 'POST', body: { id: 777 } });
  expect(repo.markInvoiceAccurateRemoved).toHaveBeenCalledWith('inv1');
});

test('hapus di Accurate gagal → invoice tetap batal, referensi Accurate tidak dilepas', async () => {
  repo.findById.mockResolvedValue(INVOICE);
  accurateRequest.mockResolvedValue({ s: false, d: ['gagal'] });

  await expect(cancelInvoice('inv1', 'u1')).resolves.toMatchObject({ status: 'CANCELLED' });
  expect(repo.markInvoiceAccurateRemoved).not.toHaveBeenCalled();
});

test('cancel invoice belum tersinkron → tidak memanggil Accurate', async () => {
  repo.findById.mockResolvedValue({ ...INVOICE, accurateInvoiceId: null });
  await cancelInvoice('inv1', 'u1');
  expect(accurateRequest).not.toHaveBeenCalled();
});

test('job sync untuk invoice CANCELLED dilewati (tidak dikirim ke Accurate)', async () => {
  syncRepo.findInvoiceForSync.mockResolvedValue({ id: 'inv1', status: 'CANCELLED', accurateInvoiceId: null, items: [] });
  const res = await syncInvoiceToAccurate('inv1');
  expect(res).toMatchObject({ synced: false, skipped: true });
  expect(accurateRequest).not.toHaveBeenCalled();
});
