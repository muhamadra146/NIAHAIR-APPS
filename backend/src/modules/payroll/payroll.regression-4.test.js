'use strict';

// Regression G2-03, G2-04, G2-18, G2-08, G2-obs — found by API QA 2026-10-15
jest.mock('./payroll.repository');
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));
jest.mock('../notification/notification.service', () => ({ payrollPending: jest.fn() }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));

const repo   = require('./payroll.repository');
const prisma = require('../../config/prisma');
const svc    = require('./payroll.service');

const BASE = {
  id: 'pr1', employeeId: 'e1', branchId: 'b1',
  periodStart: new Date('2026-09-01'), periodEnd: new Date('2026-09-30'),
  createdAt: new Date('2026-10-01T03:00:00Z'), lastRecalculatedAt: null, items: [],
};

beforeEach(() => jest.clearAllMocks());

describe('G2-03 bayar payroll hanya mencicil kasbon yang dipotong di slip', () => {
  const makeTx = (loans) => {
    const tx = {
      payroll:       { update: jest.fn() },
      commission:    { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      loan:          { findMany: jest.fn().mockResolvedValue(loans), update: jest.fn() },
      loanRepayment: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
    };
    prisma.$transaction.mockImplementation((fn) => fn(tx));
    return tx;
  };

  test('kasbon dibuat setelah slip dihitung tidak disentuh; total cicilan = potongan slip', async () => {
    const slip = {
      ...BASE, status: 'APPROVED',
      items: [{ type: 'DEDUCTION', category: 'kasbon', amount: '500000' }],
    };
    repo.findById.mockResolvedValueOnce(slip).mockResolvedValueOnce({ ...slip, status: 'PAID' });
    const tx = makeTx([{ id: 'L1', monthlyDeduction: '500000', remainingAmount: '1000000' }]);

    await svc.markAsPaid('pr1', 'u1');

    // hanya kasbon yang ada saat slip dihitung
    expect(tx.loan.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ employeeId: 'e1', status: 'ACTIVE', createdAt: { lte: BASE.createdAt } }),
    }));
    expect(tx.loanRepayment.create).toHaveBeenCalledTimes(1);
    expect(Number(tx.loanRepayment.create.mock.calls[0][0].data.amount)).toBe(500000);
  });

  test('cicilan dibatasi nominal kasbon di slip (nilai cicilan kasbon naik sesudah generate)', async () => {
    const slip = {
      ...BASE, status: 'APPROVED', lastRecalculatedAt: new Date('2026-10-02T03:00:00Z'),
      items: [{ type: 'DEDUCTION', category: 'kasbon', amount: '300000' }],
    };
    repo.findById.mockResolvedValueOnce(slip).mockResolvedValueOnce(slip);
    const tx = makeTx([
      { id: 'L1', monthlyDeduction: '200000', remainingAmount: '1000000' },
      { id: 'L2', monthlyDeduction: '200000', remainingAmount: '1000000' },
    ]);

    await svc.markAsPaid('pr1', 'u1');

    expect(tx.loan.findMany.mock.calls[0][0].where.createdAt).toEqual({ lte: slip.lastRecalculatedAt });
    const amounts = tx.loanRepayment.create.mock.calls.map((c) => Number(c[0].data.amount));
    expect(amounts).toEqual([200000, 100000]);
  });

  test('slip tanpa potongan kasbon → tidak ada kasbon yang dicicil', async () => {
    const slip = { ...BASE, status: 'APPROVED', items: [] };
    repo.findById.mockResolvedValueOnce(slip).mockResolvedValueOnce(slip);
    const tx = makeTx([{ id: 'L1', monthlyDeduction: '500000', remainingAmount: '1000000' }]);
    await svc.markAsPaid('pr1', 'u1');
    expect(tx.loan.findMany).not.toHaveBeenCalled();
    expect(tx.loanRepayment.create).not.toHaveBeenCalled();
  });
});

describe('G2-04 / G2-18 payroll APPROVED / PAID terkunci (PAY-005)', () => {
  test.each(['APPROVED', 'PAID'])('hapus payroll %s → 422', async (status) => {
    repo.findById.mockResolvedValue({ ...BASE, status });
    await expect(svc.deletePayroll('pr1')).rejects.toMatchObject({ statusCode: 422 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test.each(['DRAFT', 'PENDING_APPROVAL'])('hapus payroll %s → boleh', async (status) => {
    repo.findById.mockResolvedValue({ ...BASE, status });
    const tx = {
      commission: { updateMany: jest.fn() }, payrollItem: { deleteMany: jest.fn() }, payroll: { delete: jest.fn() },
    };
    prisma.$transaction.mockImplementation((fn) => fn(tx));
    await expect(svc.deletePayroll('pr1')).resolves.toEqual({ deleted: true });
    expect(tx.payroll.delete).toHaveBeenCalled();
  });

  test.each(['APPROVED', 'PAID'])('ubah catatan payroll %s → 422', async (status) => {
    repo.findById.mockResolvedValue({ ...BASE, status });
    await expect(svc.updateNotes('pr1', 'x')).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.update).not.toHaveBeenCalled();
  });

  test('ubah catatan DRAFT → boleh', async () => {
    repo.findById.mockResolvedValue({ ...BASE, status: 'DRAFT' });
    repo.update.mockResolvedValue({ id: 'pr1', notes: 'x' });
    await svc.updateNotes('pr1', 'x');
    expect(repo.update).toHaveBeenCalledWith('pr1', { notes: 'x' });
  });
});

describe('G2-08 laporan BPJS: iuran perusahaan dari gaji pokok penuh', () => {
  const employee = {
    id: 'e1', name: 'A',
    salarySettings: [{ baseSalary: '3000000', bpjsJhtEmployerPercent: '3.7', bpjsJpEmployerPercent: '2', bpjsKesehatanEmployerPercent: '4' }],
  };

  test('slip proporsional → dasar = gaji pokok setting', async () => {
    repo.findBpjsData.mockResolvedValue([{
      ...BASE, status: 'PAID', employee,
      items: [{ category: 'gaji', amount: '1666667', quantity: '15', rate: '111111.11' }],
    }]);
    const { data } = await svc.getBpjsReport({ yearMonth: '2026-09' });
    expect(data[0].baseSalary).toBe(3000000);
    expect(data[0].bpjsJhtEmployer).toBe(111000);
    expect(data[0].bpjsKesehatanEmployer).toBe(120000);
  });

  test('slip penuh → dasar = item gaji (historis)', async () => {
    repo.findBpjsData.mockResolvedValue([{
      ...BASE, status: 'PAID', employee,
      items: [{ category: 'gaji', amount: '2800000', quantity: null }],
    }]);
    const { data } = await svc.getBpjsReport({ yearMonth: '2026-09' });
    expect(data[0].baseSalary).toBe(2800000);
  });
});

describe('G2-obs tanggal kalender yang tidak ada ditolak', () => {
  test.each([['2026-02-30', '2026-03-10'], ['2026-01-01', '2026-13-01'], ['2026-1-1', '2026-01-31']])(
    '%s s/d %s → 400', async (periodStart, periodEnd) => {
      await expect(svc.generate({ employeeId: 'e1', branchId: 'b1', periodStart, periodEnd }, 'u1'))
        .rejects.toMatchObject({ statusCode: 400 });
      expect(repo.getGenerationData).not.toHaveBeenCalled();
    });

  test('preview juga menolak', async () => {
    await expect(svc.previewPeriod({ employeeId: 'e1', periodStart: '2026-02-29', periodEnd: '2026-03-31' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});
