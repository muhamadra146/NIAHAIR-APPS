'use strict';

// Regression (QA POS 2026-10-17) — P4: Accurate membulatkan PPN ke rupiah penuh, ERP menyimpan sen.
// Faktur PPN exclusive dengan pajak pecahan (mis. ERP 155.391,12 vs Accurate 155.391) → pelunasan
// penuh ditolak "melebihi nilai piutang". Selisih pembulatan < Rp 1 diserap saat sync penerimaan.
// Juga: pesan Inggris di createPayment diterjemahkan.
// Found by /qa on 2026-10-17

jest.mock('./payment.sync.repository', () => ({ findPaymentForSync: jest.fn(), markPaymentSynced: jest.fn() }));
jest.mock('../branch/branch.repository', () => ({ getAccurateBranchId: jest.fn().mockResolvedValue(null) }));
jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('../../config/prisma', () => ({
  payment: { findUnique: jest.fn().mockResolvedValue({ invoice: { branchId: 'b1' } }) },
}));

const syncRepo = require('./payment.sync.repository');
const { accurateRequest } = require('../accurate/accurate.client');
const { syncPaymentToAccurate } = require('./payment.sync.service');

const payment = (amount) => ({
  id: 'pay1', paymentNo: 'PAY-1', amount: String(amount), paymentDate: new Date('2026-10-17T03:00:00Z'), notes: null,
  accurateReceiptId: null,
  invoice: { invoiceNo: 'INV-1', notes: null, accurateInvoiceId: 900, customer: { customerNo: 'C-1' } },
  paymentMethod: { cashAccount: { accurateAccountId: 11 } },
});

beforeEach(() => jest.clearAllMocks());

const sentAmount = () => accurateRequest.mock.calls[1][1].body.detailInvoice[0].paymentAmount;

test('selisih pembulatan PPN < Rp 1 → penerimaan Accurate = sisa piutang Accurate', async () => {
  syncRepo.findPaymentForSync.mockResolvedValue(payment(155391.12));
  accurateRequest
    .mockResolvedValueOnce({ s: true, d: { primeOwing: 155391 } })
    .mockResolvedValueOnce({ s: true, r: { id: 5, number: 'R-1' } });

  await syncPaymentToAccurate('pay1');
  expect(sentAmount()).toBe(155391);
});

test('selisih ≥ Rp 1 tidak disesuaikan (tetap nominal ERP — Accurate yang menolak)', async () => {
  syncRepo.findPaymentForSync.mockResolvedValue(payment(777000));
  accurateRequest
    .mockResolvedValueOnce({ s: true, d: { primeOwing: 700000 } })
    .mockResolvedValueOnce({ s: false, d: ['Pembayaran faktur melebihi nilai piutang fakturnya'] });

  await expect(syncPaymentToAccurate('pay1')).rejects.toThrow('melebihi nilai piutang');
  expect(sentAmount()).toBe(777000);
});

test('sisa piutang cukup → nominal ERP dikirim apa adanya', async () => {
  syncRepo.findPaymentForSync.mockResolvedValue(payment(100000));
  accurateRequest
    .mockResolvedValueOnce({ s: true, d: { primeOwing: 155391 } })
    .mockResolvedValueOnce({ s: true, r: { id: 6, number: 'R-2' } });

  await syncPaymentToAccurate('pay1');
  expect(sentAmount()).toBe(100000);
});

test('jaring pengaman selisih pembulatan tetap ada dan dicatat ke log saat terpicu (2026-10-17)', async () => {
  const logger = require('../../utils/logger');
  const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
  syncRepo.findPaymentForSync.mockResolvedValue(payment(159716.09));
  accurateRequest
    .mockResolvedValueOnce({ s: true, d: { primeOwing: 159715.5 } })
    .mockResolvedValueOnce({ s: true, r: { id: 7, number: 'R-3' } });

  await syncPaymentToAccurate('pay1');
  expect(sentAmount()).toBe(159715.5);
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('jaring pengaman selisih pembulatan PPN terpicu'));
  warn.mockRestore();
});

test('nominal sama dengan sisa piutang → tidak ada log jaring pengaman', async () => {
  const logger = require('../../utils/logger');
  const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
  syncRepo.findPaymentForSync.mockResolvedValue(payment(155391));
  accurateRequest
    .mockResolvedValueOnce({ s: true, d: { primeOwing: 155391 } })
    .mockResolvedValueOnce({ s: true, r: { id: 8, number: 'R-4' } });

  await syncPaymentToAccurate('pay1');
  expect(sentAmount()).toBe(155391);
  expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('jaring pengaman'));
  warn.mockRestore();
});
