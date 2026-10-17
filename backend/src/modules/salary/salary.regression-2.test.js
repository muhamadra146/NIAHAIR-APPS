'use strict';

// Regression G2-17 — persen BPJS 0..100 dan urutan tanggal Setting Gaji (API QA 2026-10-15)
jest.mock('./salary.repository', () => ({
  findById:           jest.fn(),
  create:             jest.fn(),
  deactivatePrevious: jest.fn(),
  update:             jest.fn(),
}));

const { safeParse } = require('valibot');
const repo = require('./salary.repository');
const { createSalarySchema, updateSalarySchema } = require('./salary.validation');
const { createSetting, updateSetting } = require('./salary.service');

beforeEach(() => jest.clearAllMocks());

describe('persen BPJS', () => {
  const base = { employeeId: 'e1', baseSalary: 3000000, effectiveDate: '2026-10-01' };

  test.each(['bpjsJhtPercent', 'bpjsJpEmployerPercent', 'bpjsKesehatanEmployerPercent'])('%s 250 ditolak', (field) => {
    expect(safeParse(createSalarySchema, { ...base, [field]: 250 }).success).toBe(false);
    expect(safeParse(updateSalarySchema, { [field]: 250 }).success).toBe(false);
  });

  test('0 dan 100 diterima', () => {
    expect(safeParse(createSalarySchema, { ...base, bpjsJhtPercent: 0, bpjsJpPercent: 100 }).success).toBe(true);
  });
});

describe('urutan tanggal', () => {
  test('create: endDate < effectiveDate → 400', async () => {
    await expect(createSetting({ employeeId: 'e1', baseSalary: 1, effectiveDate: '2026-10-01', endDate: '2026-09-01' }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(repo.create).not.toHaveBeenCalled();
  });

  test('update: endDate sebelum effectiveDate tersimpan → 400', async () => {
    repo.findById.mockResolvedValue({ id: 's1', employeeId: 'e1', effectiveDate: new Date('2026-10-01'), endDate: null });
    await expect(updateSetting('s1', { endDate: '2026-09-01' })).rejects.toMatchObject({ statusCode: 400 });
    expect(repo.update).not.toHaveBeenCalled();
  });

  test('update: effectiveDate baru melewati endDate tersimpan → 400', async () => {
    repo.findById.mockResolvedValue({ id: 's1', employeeId: 'e1', effectiveDate: new Date('2026-01-01'), endDate: new Date('2026-06-30') });
    await expect(updateSetting('s1', { effectiveDate: '2026-07-01' })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('update: hapus endDate (null) → boleh', async () => {
    repo.findById.mockResolvedValue({ id: 's1', employeeId: 'e1', effectiveDate: new Date('2026-10-01'), endDate: new Date('2026-12-01') });
    repo.update.mockResolvedValue({ id: 's1' });
    await updateSetting('s1', { endDate: null });
    expect(repo.update).toHaveBeenCalledWith('s1', expect.objectContaining({ endDate: null }));
  });
});
