'use strict';

// Regression: keputusan user 2026-10-19 (CRM-014) — paket membership bisa dinonaktifkan.
// - Daftar paket bisa difilter isActive (default semua).
// - Paket nonaktif tidak bisa ditetapkan / diperpanjang ke pelanggan → 422.
// - Paket yang sudah dipakai tetap tidak bisa dihapus → 409 dengan saran tombol Nonaktifkan.

jest.mock('./membership.repository');
jest.mock('../../config/prisma', () => ({
  customer:           { findUnique: jest.fn() },
  customerMembership: { count: jest.fn().mockResolvedValue(0) },
  invoice:            { count: jest.fn().mockResolvedValue(0) },
  $transaction:       jest.fn(),
}));

const v = require('valibot');
const repo = require('./membership.repository');
const prisma = require('../../config/prisma');
const svc = require('./membership.service');
const { updateMembershipSchema } = require('./membership.validation');

const M = { id: 'm1', name: 'Gold', price: 1, durationDays: 30, discountType: 'PERCENTAGE', discountValue: 10, isActive: true };

beforeEach(() => {
  jest.clearAllMocks();
  repo.findById.mockResolvedValue(M);
  repo.findAll.mockResolvedValue([]);
  repo.count.mockResolvedValue(0);
  repo.findByName.mockResolvedValue(null);
  repo.countCustomers.mockResolvedValue(0);
  repo.update.mockImplementation((id, data) => Promise.resolve({ ...M, ...data }));
  prisma.customer.findUnique.mockResolvedValue({ id: 'c1' });
});

test.each([
  [undefined, undefined],
  ['', undefined],
  ['all', undefined],
  ['true', true],
  ['false', false],
  [true, true],
])('getAll isActive=%p → where.isActive %p', async (isActive, expected) => {
  await svc.getAll({ page: 1, limit: 20, isActive });
  const { where } = repo.findAll.mock.calls[0][0];
  expect(where.isActive).toBe(expected);
  expect(repo.count).toHaveBeenCalledWith(where);
});

test('update schema menerima isActive boolean, menolak string', () => {
  expect(v.safeParse(updateMembershipSchema, { isActive: false }).success).toBe(true);
  expect(v.safeParse(updateMembershipSchema, { isActive: 'no' }).success).toBe(false);
});

test('update isActive=false disimpan tanpa menyentuh field lain', async () => {
  await svc.update('m1', { isActive: false });
  expect(repo.update).toHaveBeenCalledWith('m1', { isActive: false, categoryIds: undefined });
});

test('assign paket nonaktif → 422 "Paket membership tidak aktif", tidak ada transaksi', async () => {
  repo.findById.mockResolvedValue({ ...M, isActive: false });
  await expect(svc.assignMembership('c1', 'm1', 'u1')).rejects.toMatchObject({
    statusCode: 422,
    message: 'Paket membership tidak aktif',
  });
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

test('assign paket aktif tetap jalan', async () => {
  prisma.$transaction.mockResolvedValue({ id: 'cm1' });
  await expect(svc.assignMembership('c1', 'm1', 'u1')).resolves.toEqual({ id: 'cm1' });
  expect(prisma.$transaction).toHaveBeenCalled();
});

test('hapus paket yang pernah dipakai → 409 menyarankan tombol Nonaktifkan', async () => {
  repo.countUsageHistory.mockResolvedValue(2);
  await expect(svc.remove('m1')).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('Nonaktifkan') });
});

test('hapus paket yang masih dipakai pelanggan → 409 menyarankan tombol Nonaktifkan', async () => {
  repo.countCustomers.mockResolvedValue(1);
  await expect(svc.remove('m1')).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('Nonaktifkan') });
});
