'use strict';

// Regression: QA UI Keuangan 2026-10-18
//   B1 — pembayaran DP bertanggal sebelum tanggal deposit (Faktur DP) ditolak Accurate → tolak di app (422)
//   B2 — tanggal deposit yang diisi user ditimpa tanggal bayar saat DP dibayar, dan dikosongkan saat
//        pembayaran dihapus
// Found by /qa on 2026-10-18

jest.mock('./depositPayment.repository');
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));
jest.mock('./depositPayment.sync.service');
jest.mock('../../config/cloudinary', () => ({ uploader: { destroy: jest.fn() } }));
jest.mock('../../config/prisma', () => ({ deposit: { update: jest.fn() } }));

const repo = require('./depositPayment.repository');
const { createSyncJob } = require('../syncQueue/syncQueue.service');
const { createDepositPayment, deleteDepositPayment } = require('./depositPayment.service');
const { mapDepositPaymentToAccurate } = require('./depositPayment.sync.mapper');

const DEPOSIT = {
  id: 'd1', amount: '100000', status: 'UNPAID', _count: { invoiceDeposits: 0 },
  paidAt: new Date('2026-10-10T00:00:00.000Z'),      // tanggal deposit 10/10/2026 (WIB)
  createdAt: new Date('2026-10-18T03:00:00.000Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
  repo.findDepositForPayment.mockResolvedValue(DEPOSIT);
  repo.findPaymentMethodById.mockResolvedValue({ id: 'pm1', isActive: true });
  repo.findLastNumber.mockResolvedValue(null);
  repo.create.mockResolvedValue({ id: 'p1' });
  repo.findById.mockResolvedValue({ id: 'p1', depositId: 'd1' });
});

describe('B1 — tanggal bayar vs tanggal deposit', () => {
  test('tanggal bayar sebelum tanggal deposit → 422, tidak tersimpan', async () => {
    await expect(createDepositPayment({ depositId: 'd1', paymentMethodId: 'pm1', paidAt: '2026-10-09T00:00:00.000Z' }))
      .rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining('10/10/2026') });
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.markDepositPaid).not.toHaveBeenCalled();
    expect(createSyncJob).not.toHaveBeenCalled();
  });

  test('tanggal bayar = tanggal deposit (input jam lokal WIB) → boleh', async () => {
    // 2026-10-09T17:00Z = 2026-10-10 00:00 WIB
    await createDepositPayment({ depositId: 'd1', paymentMethodId: 'pm1', paidAt: '2026-10-09T17:00:00.000Z' });
    expect(repo.create).toHaveBeenCalled();
  });

  test('deposit tanpa tanggal → dibandingkan dengan createdAt (WIB)', async () => {
    repo.findDepositForPayment.mockResolvedValue({ ...DEPOSIT, paidAt: null });
    await expect(createDepositPayment({ depositId: 'd1', paymentMethodId: 'pm1', paidAt: '2026-10-17T00:00:00.000Z' }))
      .rejects.toMatchObject({ statusCode: 422 });
    await createDepositPayment({ depositId: 'd1', paymentMethodId: 'pm1', paidAt: '2026-10-18T00:00:00.000Z' });
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  test('tanggal bayar tidak valid → 422', async () => {
    await expect(createDepositPayment({ depositId: 'd1', paymentMethodId: 'pm1', paidAt: 'bukan-tanggal' }))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  test('tanggal penerimaan ke Accurate memakai kalender WIB', () => {
    const payload = mapDepositPaymentToAccurate({
      paymentNo: 'DPAY-1', amount: '100000', notes: null, paidAt: new Date('2026-10-09T17:00:00.000Z'),
      deposit: { customer: { customerNo: 'C-1' }, accurateDepositId: 5, accurateDepositNumber: 'DP-1' },
      paymentMethod: { cashAccount: { accurateAccountId: 9 } },
    });
    expect(payload.transDate).toBe('10/10/2026');
  });
});

describe('B2 — tanggal deposit tidak diubah oleh pembayaran', () => {
  test('bayar DP hanya mengubah status', async () => {
    await createDepositPayment({ depositId: 'd1', paymentMethodId: 'pm1', paidAt: '2026-10-12T00:00:00.000Z' });
    expect(repo.markDepositPaid).toHaveBeenCalledWith('d1');
  });

  test('repository: markDepositPaid & revertDepositToUnpaid tidak menyentuh paidAt deposit', () => {
    const { update } = require('../../config/prisma').deposit;
    const realRepo = jest.requireActual('./depositPayment.repository');
    realRepo.markDepositPaid('d1');
    realRepo.revertDepositToUnpaid('d1');
    expect(update).toHaveBeenNthCalledWith(1, { where: { id: 'd1' }, data: { status: 'PAID' } });
    expect(update).toHaveBeenNthCalledWith(2, { where: { id: 'd1' }, data: { status: 'UNPAID' } });
  });

  test('hapus pembayaran mengembalikan status UNPAID', async () => {
    repo.findById.mockResolvedValue({ id: 'p1', depositId: 'd1', accurateReceiptId: null });
    repo.findDepositForPayment.mockResolvedValue({ ...DEPOSIT, status: 'PAID' });
    await expect(deleteDepositPayment('p1')).resolves.toEqual({ deleted: true });
    expect(repo.revertDepositToUnpaid).toHaveBeenCalledWith('d1');
  });
});
