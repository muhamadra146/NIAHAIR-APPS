'use strict';

// Regression — UI QA 2026-10-18: hapus kategori yang masih punya job → 500; kode "QA FIN!" diterima
jest.mock('./commissionCategory.repository');

const { safeParse } = require('valibot');
const repo = require('./commissionCategory.repository');
const svc  = require('./commissionCategory.service');
const { createCommissionCategorySchema, updateCommissionCategorySchema } = require('./commissionCategory.validation');

const CATEGORY = { id: 'cc1', code: 'HAIR', name: 'Hair Service', isActive: true };

beforeEach(() => {
  jest.clearAllMocks();
  repo.findById.mockResolvedValue(CATEGORY);
  repo.findByCode.mockResolvedValue(null);
  repo.create.mockImplementation(async (d) => ({ id: 'new', ...d }));
  repo.update.mockImplementation(async (id, d) => ({ id, ...d }));
  repo.countRulesByCategory.mockResolvedValue(0);
  repo.countJobsByCategory.mockResolvedValue(0);
});

describe('hapus kategori', () => {
  test('masih punya job → 409 dengan jumlah job, tidak menghapus', async () => {
    repo.countJobsByCategory.mockResolvedValue(3);
    await expect(svc.deleteCommissionCategory('cc1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'Kategori masih dipakai oleh 3 job; hapus/pindahkan job dulu',
    });
    expect(repo.deleteById).not.toHaveBeenCalled();
  });

  test('tanpa rule & job → dihapus', async () => {
    await svc.deleteCommissionCategory('cc1');
    expect(repo.deleteById).toHaveBeenCalledWith('cc1');
  });
});

describe('kode kategori', () => {
  test('validasi: "QA FIN!" ditolak dengan pesan Indonesia', () => {
    const r = safeParse(createCommissionCategorySchema, { code: 'QA FIN!', name: 'QA' });
    expect(r.success).toBe(false);
    expect(r.issues[0].message).toBe('Kode hanya boleh huruf, angka, dan garis bawah (_)');
  });

  test('validasi: dinormalisasi " hair  color " → "HAIR_COLOR"', () => {
    const r = safeParse(createCommissionCategorySchema, { code: ' hair  color ', name: ' Warna ' });
    expect(r.success).toBe(true);
    expect(r.output.code).toBe('HAIR_COLOR');
    expect(r.output.name).toBe('Warna');
  });

  test('validasi update: kode kosong/spasi ditolak', () => {
    expect(safeParse(updateCommissionCategorySchema, { code: '   ' }).success).toBe(false);
  });

  test('service: create menormalkan kode & menolak karakter ilegal', async () => {
    await svc.createCommissionCategory({ code: 'qa com', name: 'QA' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ code: 'QA_COM' }));
    await expect(svc.createCommissionCategory({ code: 'QA FIN!', name: 'QA' }))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  test('service: update menormalkan kode sebelum cek duplikat', async () => {
    await svc.updateCommissionCategory('cc1', { code: 'hair' });
    expect(repo.findByCode).not.toHaveBeenCalled(); // sama dengan kode lama setelah normalisasi
    expect(repo.update).toHaveBeenCalledWith('cc1', expect.objectContaining({ code: 'HAIR' }));
  });
});
