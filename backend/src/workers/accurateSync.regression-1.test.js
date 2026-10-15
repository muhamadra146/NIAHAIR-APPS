// Regression: G4-14 / G4-19 / G1-30 / G5-03 — worker sync Accurate:
//   G4-14 job ITEM ditandai SUCCESS padahal item tidak pernah dipush (handler kosong)
//   G4-19 job yang sama diproses dua kali (inline + interval) — harus diklaim atomik
//   G1-30 job untuk data yang sudah dihapus gagal terus sampai FAILED selamanya
//   G5-03 job macet di PROCESSING setelah worker mati — dikembalikan ke PENDING tiap tick
// Found by /qa on 2026-10-15
'use strict';

jest.mock('../modules/syncQueue/syncQueue.repository', () => ({
  findPending:  jest.fn(),
  claimPending: jest.fn(),
  markSkipped:  jest.fn(),
  entityExists: jest.fn(),
  markSuccess:  jest.fn(),
  markFailed:   jest.fn(),
  reclaimStaleProcessing: jest.fn().mockResolvedValue(0),
}));
jest.mock('../modules/item/item.push.service', () => ({ pushItemToAccurate: jest.fn() }));
jest.mock('../modules/customer/customer.push.service', () => ({ pushCustomerToAccurate: jest.fn() }));
jest.mock('../modules/deposit/deposit.sync.service', () => ({ syncDepositToAccurate: jest.fn() }));
jest.mock('../modules/invoice/invoice.sync.service', () => ({ syncInvoiceToAccurate: jest.fn() }));
jest.mock('../modules/payment/payment.sync.service', () => ({ syncPaymentToAccurate: jest.fn() }));
jest.mock('../modules/depositPayment/depositPayment.sync.service', () => ({ syncDepositPaymentToAccurate: jest.fn() }));
jest.mock('../modules/stockTransfer/stockTransfer.sync.service', () => ({ syncTransferToAccurate: jest.fn(), syncTransferReceiveToAccurate: jest.fn() }));
jest.mock('../modules/purchase/purchase.accurate.sync.service', () => ({ pushPurchaseInvoiceToAccurate: jest.fn() }));
jest.mock('../modules/purchaseReturn/purchaseReturn.accurate.sync.service', () => ({ pushPurchaseReturnToAccurate: jest.fn() }));
jest.mock('../modules/payroll/payroll.sync.service', () => ({ syncPayrollToAccurate: jest.fn() }));

const repo = require('../modules/syncQueue/syncQueue.repository');
const { pushItemToAccurate }     = require('../modules/item/item.push.service');
const { pushCustomerToAccurate } = require('../modules/customer/customer.push.service');
const { processSyncQueue } = require('./accurateSync.worker');

const job = (entityType, id = 'j1') => ({ id, entityType, entityId: 'e1', direction: 'APP_TO_ACCURATE' });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  repo.claimPending.mockResolvedValue(true);
  repo.entityExists.mockResolvedValue(true);
});

test('G4-14: job ITEM memanggil pushItemToAccurate sebelum SUCCESS', async () => {
  repo.findPending.mockResolvedValue([job('ITEM')]);
  await processSyncQueue();
  expect(pushItemToAccurate).toHaveBeenCalledWith('e1');
  expect(repo.markSuccess).toHaveBeenCalledWith('j1');
});

test('G4-14: push item gagal → markFailed, bukan SUCCESS', async () => {
  repo.findPending.mockResolvedValue([job('ITEM')]);
  pushItemToAccurate.mockRejectedValueOnce(new Error('Accurate menolak'));
  await processSyncQueue();
  expect(repo.markFailed).toHaveBeenCalledWith('j1', 'Accurate menolak');
  expect(repo.markSuccess).not.toHaveBeenCalled();
});

test('G4-19: job yang sudah diklaim runner lain dilewati (handler tidak dipanggil)', async () => {
  repo.findPending.mockResolvedValue([job('CUSTOMER')]);
  repo.claimPending.mockResolvedValue(false);
  await processSyncQueue();
  expect(repo.claimPending).toHaveBeenCalledWith('j1');
  expect(pushCustomerToAccurate).not.toHaveBeenCalled();
  expect(repo.markSuccess).not.toHaveBeenCalled();
  expect(repo.markFailed).not.toHaveBeenCalled();
});

test('G5-03: tiap tick mengembalikan job PROCESSING yang macet sebelum mengambil PENDING', async () => {
  repo.findPending.mockResolvedValue([]);
  await processSyncQueue();
  expect(repo.reclaimStaleProcessing).toHaveBeenCalledTimes(1);
  expect(repo.reclaimStaleProcessing.mock.invocationCallOrder[0])
    .toBeLessThan(repo.findPending.mock.invocationCallOrder[0]);
});

test('G1-30: data sumber sudah dihapus → markSkipped, tidak retry/FAILED', async () => {
  repo.findPending.mockResolvedValue([job('CUSTOMER')]);
  repo.entityExists.mockResolvedValue(false);
  await processSyncQueue();
  expect(repo.markSkipped).toHaveBeenCalledWith('j1', expect.stringContaining('dihapus'));
  expect(pushCustomerToAccurate).not.toHaveBeenCalled();
  expect(repo.markFailed).not.toHaveBeenCalled();
});
