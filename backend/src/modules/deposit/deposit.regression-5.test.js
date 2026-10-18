'use strict';

// Regression: QA UI Keuangan 2026-10-18
//   B1 — Faktur DP ke Accurate memakai createdAt, bukan tanggal deposit → pembayaran DP yang
//        bertanggal lebih awal ditolak Accurate ("Tanggal Penerimaan Penjualan mendahului Tanggal Faktur")
//   B3 — filter periode daftar deposit masih memakai createdAt padahal daftar menampilkan tanggal deposit
//   B4 — "Sisa" deposit REFUNDED / CANCELLED masih tampil penuh
// Found by /qa on 2026-10-18

jest.mock('./deposit.repository');
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));
jest.mock('./deposit.sync.service', () => ({ updateDepositInAccurate: jest.fn(), deleteDepositFromAccurate: jest.fn() }));
jest.mock('../../config/prisma', () => ({}));

const repo = require('./deposit.repository');
const { listDeposits, getDepositById, refundDeposit, cancelDeposit } = require('./deposit.service');
const { mapDepositToAccurate } = require('./deposit.sync.mapper');

const base = {
  id: 'd1', customerId: 'c1', amount: '100000', status: 'PAID',
  invoiceDeposits: [], customer: { customerNo: 'C-1' }, appointment: null, notes: null,
};

beforeEach(() => jest.clearAllMocks());

describe('B1 — tanggal Faktur DP = tanggal deposit', () => {
  test('memakai paidAt (tanggal deposit, 00:00 UTC) bukan createdAt', () => {
    const payload = mapDepositToAccurate({
      ...base,
      paidAt:    new Date('2026-10-10T00:00:00.000Z'),
      createdAt: new Date('2026-10-18T03:00:00.000Z'),
    });
    expect(payload.transDate).toBe('10/10/2026');
  });

  test('fallback createdAt (kalender WIB) bila tanggal deposit kosong', () => {
    // 2026-10-17 20:00 UTC = 2026-10-18 03:00 WIB
    const payload = mapDepositToAccurate({ ...base, paidAt: null, createdAt: new Date('2026-10-17T20:00:00.000Z') });
    expect(payload.transDate).toBe('18/10/2026');
  });
});

describe('B3 — filter periode memakai tanggal deposit', () => {
  test('where memakai paidAt, fallback createdAt saat paidAt null', async () => {
    repo.findAll.mockResolvedValue([]);
    repo.count.mockResolvedValue(0);
    await listDeposits({ startDate: '2026-10-01', endDate: '2026-10-10' });
    const { where } = repo.findAll.mock.calls[0][0];
    const range = { gte: new Date('2026-10-01T00:00:00.000+07:00'), lte: new Date('2026-10-10T23:59:59.999+07:00') };
    expect(where.createdAt).toBeUndefined();
    expect(where.OR).toEqual([{ paidAt: range }, { paidAt: null, createdAt: range }]);
  });
});

describe('B4 — sisa deposit REFUNDED / CANCELLED = 0', () => {
  test.each(['REFUNDED', 'CANCELLED'])('detail %s → remainingAmount 0', async (status) => {
    repo.findById.mockResolvedValue({ ...base, status });
    const d = await getDepositById('d1');
    expect(String(d.remainingAmount)).toBe('0');
  });

  test('list: REFUNDED 0, PAID tetap penuh, PARTIAL_USED = amount − terpakai', async () => {
    repo.findAll.mockResolvedValue([
      { ...base, id: 'a', status: 'REFUNDED', invoiceDeposits: [{ amountApplied: '30000' }] },
      { ...base, id: 'b', status: 'PAID' },
      { ...base, id: 'c', status: 'PARTIAL_USED', invoiceDeposits: [{ amountApplied: '30000' }] },
    ]);
    repo.count.mockResolvedValue(3);
    const { data } = await listDeposits({});
    expect(data.map((d) => String(d.remainingAmount))).toEqual(['0', '100000', '70000']);
    expect(String(data[0].usedAmount)).toBe('30000');
  });

  test('response refund & batal langsung sisa 0', async () => {
    repo.findById.mockResolvedValue({ ...base, status: 'PAID' });
    repo.sumPaid.mockResolvedValue('100000');
    repo.updateStatus.mockImplementation((id, status) => Promise.resolve({ ...base, status }));
    expect(String((await refundDeposit('d1')).remainingAmount)).toBe('0');
    expect(String((await cancelDeposit('d1')).remainingAmount)).toBe('0');
  });
});
