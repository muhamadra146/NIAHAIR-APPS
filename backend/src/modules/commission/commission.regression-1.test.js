'use strict';

// Regression: komisi yang sudah tercatat di slip payroll masih bisa di-override/dihapus
// → slip payroll dan komisi tidak sama lagi
// Found by /qa on 2026-10-06
// Report: .gstack/qa-reports/qa-report-localhost-2026-10-06.md

jest.mock('./commission.repository');

const repo = require('./commission.repository');
const svc  = require('./commission.service');

beforeEach(() => jest.clearAllMocks());

describe('overrideCommission', () => {
  test('menolak override komisi yang sudah masuk payroll', async () => {
    repo.findById.mockResolvedValue({ id: 'c1', status: 'APPROVED', payrollId: 'pr1', invoiceId: 'i1' });
    await expect(svc.overrideCommission('c1', { commissionAmount: 1000, userId: 'u1' }))
      .rejects.toMatchObject({ statusCode: 422 });
    expect(repo.overrideOne).not.toHaveBeenCalled();
  });

  test('komisi APPROVED tanpa payroll tetap bisa di-override', async () => {
    repo.findById.mockResolvedValue({ id: 'c1', status: 'APPROVED', payrollId: null, invoiceId: 'i1' });
    repo.overrideOne.mockResolvedValue({ id: 'c1' });
    await svc.overrideCommission('c1', { commissionAmount: 1000, userId: 'u1' });
    expect(repo.overrideOne).toHaveBeenCalled();
  });
});

describe('deleteCommission (SUPER_ADMIN reset invoice)', () => {
  test('menolak reset bila salah satu komisi invoice sudah masuk payroll', async () => {
    repo.findById.mockResolvedValue({ id: 'c1', status: 'PENDING', payrollId: null, invoiceId: 'i1' });
    repo.findAllByInvoice.mockResolvedValue([
      { id: 'c1', payrollId: null },
      { id: 'c2', payrollId: 'pr1' },
    ]);
    await expect(svc.deleteCommission('c1', 'SUPER_ADMIN')).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.deleteAllByInvoice).not.toHaveBeenCalled();
  });

  test('reset jalan bila belum ada yang masuk payroll', async () => {
    repo.findById.mockResolvedValue({ id: 'c1', status: 'APPROVED', payrollId: null, invoiceId: 'i1' });
    repo.findAllByInvoice.mockResolvedValue([{ id: 'c1', payrollId: null }]);
    repo.deleteAllByInvoice.mockResolvedValue({ count: 1 });
    const r = await svc.deleteCommission('c1', 'SUPER_ADMIN');
    expect(r.deleted).toBe(1);
  });
});
