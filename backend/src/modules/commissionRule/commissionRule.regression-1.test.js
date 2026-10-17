'use strict';

// Regression G2-05, G2-15 — found by API QA 2026-10-15
jest.mock('./commissionRule.repository');

const repo = require('./commissionRule.repository');
const svc  = require('./commissionRule.service');

const RULE = {
  id: 'r1', employeeId: 'e1', commissionCategoryId: 'cat1', commissionJobId: 'j1',
  commissionType: 'FIXED', commissionValue: '25000',
  effectiveDate: new Date('2026-10-01'), endDate: null,
};
const BODY = {
  employeeId: 'e1', commissionCategoryId: 'cat1', commissionJobId: 'j1',
  commissionType: 'PERCENTAGE', commissionValue: 10, effectiveDate: '2026-10-01',
};

beforeEach(() => {
  jest.clearAllMocks();
  repo.findById.mockResolvedValue(RULE);
  repo.findEmployeeById.mockResolvedValue({ id: 'e1' });
  repo.findCommissionCategoryById.mockResolvedValue({ id: 'cat1' });
  repo.findCommissionJobById.mockResolvedValue({ id: 'j1', commissionCategoryId: 'cat1' });
  repo.findDuplicate.mockResolvedValue(null);
  repo.create.mockImplementation(async (d) => d);
  repo.update.mockImplementation(async (id, d) => ({ id, ...d }));
});

describe('G2-05 tipe + nilai efektif', () => {
  test('FIXED 25000 → PERCENTAGE tanpa nilai baru → 400', async () => {
    await expect(svc.updateCommissionRule('r1', { commissionType: 'PERCENTAGE' }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(repo.update).not.toHaveBeenCalled();
  });

  test('ganti tipe sekaligus nilai valid → ok', async () => {
    await svc.updateCommissionRule('r1', { commissionType: 'PERCENTAGE', commissionValue: 10 });
    expect(repo.update).toHaveBeenCalled();
  });
});

describe('G2-15 job & tanggal', () => {
  test('create: job dari kategori lain → 400', async () => {
    repo.findCommissionJobById.mockResolvedValue({ id: 'j1', commissionCategoryId: 'catLain' });
    await expect(svc.createCommissionRule(BODY)).rejects.toMatchObject({ statusCode: 400 });
    expect(repo.create).not.toHaveBeenCalled();
  });

  test('create: endDate < effectiveDate → 400', async () => {
    await expect(svc.createCommissionRule({ ...BODY, endDate: '2026-09-30' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('update: endDate sebelum effectiveDate tersimpan → 400', async () => {
    await expect(svc.updateCommissionRule('r1', { endDate: '2026-09-01' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('update: pindah kategori tanpa ganti job (job kategori lama) → 400', async () => {
    repo.findCommissionCategoryById.mockResolvedValue({ id: 'cat2' });
    await expect(svc.updateCommissionRule('r1', { commissionCategoryId: 'cat2' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('create valid → ok', async () => {
    await svc.createCommissionRule({ ...BODY, endDate: '2026-12-31' });
    expect(repo.create).toHaveBeenCalled();
  });
});
