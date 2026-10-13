'use strict';

// Keputusan user 2026-10-13 (B3): Kas Masuk = pembayaran invoice + pembayaran DP/deposit

jest.mock('../../config/prisma', () => ({
  payment:        { aggregate: jest.fn() },
  depositPayment: { aggregate: jest.fn() },
}));

const prisma = require('../../config/prisma');
const { getCashReceivedSummary } = require('./dashboard.repository');

test('Kas Masuk menjumlahkan pembayaran invoice dan pembayaran DP', async () => {
  prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 1000000 }, _count: { _all: 3 } });
  prisma.depositPayment.aggregate.mockResolvedValue({ _sum: { amount: 200000 }, _count: { _all: 1 } });

  const r = await getCashReceivedSummary({ branchId: 'b1', startDate: '2026-10-01', endDate: '2026-10-31' });

  expect(r).toMatchObject({ total: 1200000, paymentCount: 4, invoicePayments: 1000000, depositPayments: 200000 });
  // DP difilter lewat cabang deposit dan tanggal bayar DP
  expect(prisma.depositPayment.aggregate).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ deposit: { branchId: 'b1' }, paidAt: expect.any(Object) }),
  }));
});
