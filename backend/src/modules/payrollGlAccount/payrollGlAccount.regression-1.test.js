'use strict';

// Regression: G5-01 (QA 2026-10-15) — membuka halaman Akun Gaji (GET) menghapus semua pemetaan
// karena seeding memakai upsert yang menimpa glAccountId → jurnal gaji gagal sinkron ke Accurate.
// G2-12: kategori tak dikenal / format salah → 500.

jest.mock('./payrollGlAccount.repository', () => ({
  findAll: jest.fn().mockResolvedValue([]), upsertMany: jest.fn(), seedMissing: jest.fn(),
}));
const repo = require('./payrollGlAccount.repository');
const svc  = require('./payrollGlAccount.service');

beforeEach(() => jest.clearAllMocks());

test('GET hanya membuat kategori yang belum ada, tidak pernah menimpa pemetaan', async () => {
  await svc.getPayrollGlAccounts();
  expect(repo.seedMissing).toHaveBeenCalledTimes(1);
  expect(repo.upsertMany).not.toHaveBeenCalled();
  expect(repo.seedMissing.mock.calls[0][0]).toHaveLength(8);
});

test.each([
  ['kategori tak dikenal', [{ category: 'bogus', glAccountId: null }]],
  ['bukan array', 'x'],
  ['elemen null', [null]],
])('simpan dengan %s → 400', async (_, mappings) => {
  await expect(svc.savePayrollGlAccounts(mappings)).rejects.toMatchObject({ statusCode: 400 });
  expect(repo.upsertMany).not.toHaveBeenCalled();
});
