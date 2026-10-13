'use strict';

// Simpan item opname: validasi memakai data ringan & balasan ringkas
// (sebelumnya memuat seluruh opname ±650 item dua kali dan mengirim balik ±423 KB)

jest.mock('./stockOpname.repository');
jest.mock('../../config/prisma', () => ({
  $transaction:    jest.fn((ops) => Promise.all(ops)),
  stockOpnameItem: { update: jest.fn((args) => Promise.resolve(args)) },
  stockOpname:     { update: jest.fn() },
}));

const repo   = require('./stockOpname.repository');
const prisma = require('../../config/prisma');
const { updateItems } = require('./stockOpname.service');

beforeEach(() => jest.clearAllMocks());

test('DRAFT → simpan item, naik ke IN_PROGRESS, balasan ringkas tanpa memuat detail', async () => {
  repo.findForItemUpdate.mockResolvedValue({ id: 'o1', status: 'DRAFT', items: [{ id: 'i1' }, { id: 'i2' }] });

  const r = await updateItems('o1', [{ id: 'i1', qtyActual: 5 }]);

  expect(r).toEqual({ id: 'o1', status: 'IN_PROGRESS', updatedCount: 1 });
  expect(prisma.stockOpname.update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { status: 'IN_PROGRESS' } });
  expect(repo.findById).not.toHaveBeenCalled();
});

test('item yang bukan milik opname ditolak', async () => {
  repo.findForItemUpdate.mockResolvedValue({ id: 'o1', status: 'IN_PROGRESS', items: [{ id: 'i1' }] });
  await expect(updateItems('o1', [{ id: 'x9', qtyActual: 1 }])).rejects.toMatchObject({ statusCode: 400 });
});

test('opname POSTED tidak bisa diubah', async () => {
  repo.findForItemUpdate.mockResolvedValue({ id: 'o1', status: 'POSTED', items: [] });
  await expect(updateItems('o1', [])).rejects.toMatchObject({ statusCode: 409 });
});
