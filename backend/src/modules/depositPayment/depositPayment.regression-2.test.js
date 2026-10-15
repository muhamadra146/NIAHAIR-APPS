'use strict';

// Regression: G1-05 — DELETE /deposit-payments/:id diizinkan walau deposit sudah REFUNDED atau sudah
// dipakai di invoice; status deposit berubah jadi UNPAID padahal pemakaian/refund tetap ada.
// Found by /qa on 2026-10-15

jest.mock('./depositPayment.repository');
jest.mock('../syncQueue/syncQueue.service');
jest.mock('./depositPayment.sync.service');
jest.mock('../../config/cloudinary', () => ({ uploader: { destroy: jest.fn() } }));
jest.mock('../../config/prisma', () => ({}));

const repo = require('./depositPayment.repository');
const { deleteDepositPaymentFromAccurate } = require('./depositPayment.sync.service');
const { deleteDepositPayment } = require('./depositPayment.service');

const DP = { id: 'dp1', depositId: 'd1', accurateReceiptId: 99 };

beforeEach(() => {
  jest.clearAllMocks();
  repo.findById.mockResolvedValue(DP);
});

const expectBlocked = async () => {
  await expect(deleteDepositPayment('dp1')).rejects.toMatchObject({ statusCode: 422 });
  expect(deleteDepositPaymentFromAccurate).not.toHaveBeenCalled();
  expect(repo.removeDepositPayment).not.toHaveBeenCalled();
  expect(repo.revertDepositToUnpaid).not.toHaveBeenCalled();
};

test.each(['REFUNDED', 'CANCELLED', 'USED', 'PARTIAL_USED'])('deposit %s → 422', async (status) => {
  repo.findDepositForPayment.mockResolvedValue({ id: 'd1', status, _count: { invoiceDeposits: 0 } });
  await expectBlocked();
});

test('deposit PAID tapi punya pemakaian invoice → 422', async () => {
  repo.findDepositForPayment.mockResolvedValue({ id: 'd1', status: 'PAID', _count: { invoiceDeposits: 1 } });
  await expectBlocked();
});

test('deposit PAID belum dipakai → boleh dihapus', async () => {
  repo.findDepositForPayment.mockResolvedValue({ id: 'd1', status: 'PAID', _count: { invoiceDeposits: 0 } });
  await expect(deleteDepositPayment('dp1')).resolves.toEqual({ deleted: true });
  expect(repo.revertDepositToUnpaid).toHaveBeenCalledWith('d1');
});
