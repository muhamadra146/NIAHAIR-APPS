'use strict';

// Regression G2-01/02, G2-10, G2-19 — found by API QA 2026-10-15
jest.mock('./commission.repository');

const repo = require('./commission.repository');
const svc  = require('./commission.service');

beforeEach(() => jest.clearAllMocks());

describe('G2-01/02 bayar komisi manual ditolak (COM-017)', () => {
  test('APPROVED + sudah di slip DRAFT → 422, komisi tidak diubah', async () => {
    repo.findById.mockResolvedValue({ id: 'c1', status: 'APPROVED', payrollId: 'pr1' });
    await expect(svc.markCommissionPaid('c1', 'u1')).rejects.toMatchObject({
      statusCode: 422, message: expect.stringContaining('penggajian'),
    });
    expect(repo.markPaidOne).not.toHaveBeenCalled();
  });

  test('tidak ditemukan → 404', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.markCommissionPaid('x', 'u1')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('G2-10 sortBy=amount memakai kolom commissionAmount', () => {
  test.each([['amount', 'asc'], ['-amount', 'desc']])('%s', async (sortBy, dir) => {
    repo.findAll.mockResolvedValue([]);
    repo.count.mockResolvedValue(0);
    await svc.listCommissions({ page: 1, limit: 10, sortBy });
    expect(repo.findAll).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { commissionAmount: dir } }));
  });
});

describe('G2-19 override wajib nominal', () => {
  test.each([[{}], [{ commissionAmount: null }], [{ commissionAmount: '' }], [{ commissionAmount: 'abc' }]])(
    'body %j → 400 tanpa menyentuh data', async (body) => {
      await expect(svc.overrideCommission('c1', { ...body, userId: 'u1' })).rejects.toMatchObject({ statusCode: 400 });
      expect(repo.overrideOne).not.toHaveBeenCalled();
    });

  test('nominal 0 tetap boleh', async () => {
    repo.findById.mockResolvedValue({ id: 'c1', status: 'PENDING', payrollId: null });
    repo.overrideOne.mockResolvedValue({ id: 'c1' });
    await svc.overrideCommission('c1', { commissionAmount: 0, userId: 'u1' });
    expect(repo.overrideOne).toHaveBeenCalled();
  });
});
