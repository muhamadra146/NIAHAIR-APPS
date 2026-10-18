'use strict';

// QA 2026-10-18 (keputusan owner): "Gaji Dibayar" menurut tanggal bayar (paidAt, hari WIB),
// rincian gaji tidak untuk Manager, dan filter "Dari" > "Sampai" ditolak 400.
jest.mock('../../config/prisma', () => ({
  payroll: { aggregate: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
}));
jest.mock('../setting/setting.repository');

const prisma = require('../../config/prisma');
const repo   = require('./dashboard.repository');
const svc    = require('./dashboard.service');

beforeEach(() => {
  jest.clearAllMocks();
  prisma.payroll.aggregate.mockResolvedValue({ _count: { _all: 1 }, _sum: { netSalary: 2853333.33, grossIncome: 3123333.33, totalDeductions: 270000 } });
  prisma.payroll.groupBy.mockResolvedValue([{ employeeId: 'e1' }]);
  prisma.payroll.findMany.mockResolvedValue([{
    id: 'p1', periodStart: new Date('2026-10-01'), periodEnd: new Date('2026-10-31'), paidAt: new Date('2026-10-04T10:08:14Z'),
    grossIncome: '3123333.33', totalDeductions: '270000', netSalary: '2853333.33', accurateJournalNumber: null,
    employee: { id: 'e1', name: 'STAFF OP', employeeCode: 'EMP006' }, branch: { id: 'b1', name: 'Cabang' },
  }]);
});

test('ringkasan gaji dibayar memfilter paidAt dengan batas hari WIB, bukan periodStart', async () => {
  await repo.getPayrollSummary({ branchId: 'b1', startDate: '2026-10-01', endDate: '2026-10-31' });
  const { where } = prisma.payroll.aggregate.mock.calls[0][0];
  expect(where).toEqual({
    status: 'PAID',
    branchId: 'b1',
    paidAt: { gte: new Date('2026-09-30T17:00:00.000Z'), lte: new Date('2026-10-31T16:59:59.999Z') },
  });
  expect(where.periodStart).toBeUndefined();
});

test('rincian gaji (type=payroll) memakai filter paidAt yang sama dan angka Number', async () => {
  const res = await svc.getFinanceDetails({ type: 'payroll', branchId: 'b1', startDate: '2026-10-01', endDate: '2026-10-31', roleCode: 'FINANCE' });
  expect(prisma.payroll.findMany.mock.calls[0][0].where.paidAt).toBeDefined();
  expect(res.summary).toEqual({ total: 2853333.33, count: 1, employeeCount: 1 });
  expect(res.rows[0].netSalary).toBe(2853333.33);
});

test('Manager tidak boleh membuka rincian gaji per karyawan → 403', async () => {
  await expect(svc.getFinanceDetails({ type: 'payroll', startDate: '2026-10-01', endDate: '2026-10-31', roleCode: 'MANAGER' }))
    .rejects.toMatchObject({ statusCode: 403 });
  expect(prisma.payroll.findMany).not.toHaveBeenCalled();
});

test('"Dari" sesudah "Sampai" → 400 dengan pesan Indonesia (dashboard & rincian)', async () => {
  await expect(svc.getFinanceDashboard({ startDate: '2026-10-20', endDate: '2026-10-01' }))
    .rejects.toMatchObject({ statusCode: 400, message: 'Tanggal "Dari" tidak boleh setelah tanggal "Sampai"' });
  await expect(svc.getFinanceDetails({ type: 'revenue', startDate: '2026-10-20', endDate: '2026-10-01' }))
    .rejects.toMatchObject({ statusCode: 400 });
});

test('format tanggal salah → 400', async () => {
  await expect(svc.getFinanceDashboard({ startDate: '2026-13-45', endDate: '2026-10-01' }))
    .rejects.toMatchObject({ statusCode: 400 });
});
