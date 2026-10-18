'use strict';

// Regression: QA Data menu 2026-10-18 — B8: nama paket spasi saja / duplikat beda huruf diterima;
// B10 (keputusan owner 2026-10-18): paket yang pernah dipakai tidak boleh dihapus (riwayat ikut terhapus).

jest.mock('./membership.repository');
jest.mock('../../config/prisma', () => ({
  customerMembership: { count: jest.fn().mockResolvedValue(0) },
  invoice:            { count: jest.fn().mockResolvedValue(0) },
  $transaction:       jest.fn(),
}));

const v = require('valibot');
const repo = require('./membership.repository');
const prisma = require('../../config/prisma');
const svc = require('./membership.service');
const { createMembershipSchema, updateMembershipSchema } = require('./membership.validation');

const M = { id: 'm1', name: 'Gold', price: 1, durationDays: 30, discountType: 'PERCENTAGE', discountValue: 10 };
const BODY = { name: 'Gold', price: 1, durationDays: 30, discountType: 'PERCENTAGE', discountValue: 10 };

beforeEach(() => {
  jest.clearAllMocks();
  repo.findById.mockResolvedValue(M);
  repo.countCustomers.mockResolvedValue(0);
  repo.findByName.mockResolvedValue(null);
});

test.each([['create', createMembershipSchema], ['update', updateMembershipSchema]])('%s: nama spasi saja ditolak, nama di-trim', (_, schema) => {
  const bad = v.safeParse(schema, { ...BODY, name: '   ' });
  expect(bad.success).toBe(false);
  expect(bad.issues[0]).toMatchObject({ message: 'Nama paket wajib diisi' });
  expect(bad.issues[0].path[0].key).toBe('name');
  expect(v.safeParse(schema, { ...BODY, name: '  Gold  ' }).output.name).toBe('Gold');
});

test('create: nama sudah dipakai (beda huruf) → 409 dengan error kolom name', async () => {
  repo.findByName.mockResolvedValue({ id: 'm2', name: 'GOLD' });
  await expect(svc.create({ ...BODY, name: 'gold' })).rejects.toMatchObject({
    statusCode: 409,
    errors: [{ field: 'name', message: 'Nama paket sudah dipakai' }],
  });
  expect(repo.findByName).toHaveBeenCalledWith('gold', null);
});

test('update: cek nama mengecualikan paket itu sendiri', async () => {
  repo.update.mockResolvedValue(M);
  await svc.update('m1', { name: 'Gold' });
  expect(repo.findByName).toHaveBeenCalledWith('Gold', 'm1');
});

test('hapus paket yang punya riwayat (expired/cancelled) → 409, tidak ada yang dihapus', async () => {
  repo.countUsageHistory.mockResolvedValue(3);
  await expect(svc.remove('m1')).rejects.toMatchObject({ statusCode: 409 });
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

test('hapus paket yang belum pernah dipakai → dihapus', async () => {
  repo.countUsageHistory.mockResolvedValue(0);
  const tx = { membershipHistory: { deleteMany: jest.fn() }, customerMembership: { deleteMany: jest.fn() }, membership: { delete: jest.fn() } };
  prisma.$transaction.mockImplementationOnce((fn) => fn(tx));
  await svc.remove('m1');
  expect(tx.membership.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
});
