'use strict';

// Regression G2-06, G2-07, G2-11, G2-13, G2-14 — found by API QA 2026-10-15
jest.mock('./commissionJob.repository');
jest.mock('../../config/prisma', () => ({
  commissionCategory: { findUnique: jest.fn() },
}));

const prisma = require('../../config/prisma');
const repo   = require('./commissionJob.repository');
const svc    = require('./commissionJob.service');

const CAT = 'cat1';
const job = (over = {}) => ({
  id: 'j1', commissionCategoryId: CAT, deductsFromJobId: null,
  defaultCommissionType: null, defaultCommissionValue: null, rateTiers: [], ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  prisma.commissionCategory.findUnique.mockResolvedValue({ id: CAT });
  repo.findByKey.mockResolvedValue(null);
  repo.create.mockImplementation(async (d) => d);
  repo.update.mockImplementation(async (id, d) => ({ id, ...d }));
});

describe('G2-11 create: nama wajib teks (bukan 500)', () => {
  test.each([[{}], [{ name: 12345 }], [{ name: '   ' }], [{ name: null }]])('%j → 400', async (body) => {
    await expect(svc.createJob(CAT, body)).rejects.toMatchObject({ statusCode: 400 });
    expect(repo.create).not.toHaveBeenCalled();
  });

  test('body undefined → 400', async () => {
    await expect(svc.createJob(CAT, undefined)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('nama valid dibuat (di-trim)', async () => {
    const r = await svc.createJob(CAT, { name: '  Pasang  ' });
    expect(r).toMatchObject({ name: 'Pasang', jobKey: 'pasang' });
  });
});

describe('G2-13 update: nama kosong ditolak', () => {
  test('name "" → 400', async () => {
    repo.findById.mockResolvedValue(job());
    await expect(svc.updateJob(CAT, 'j1', { name: '' })).rejects.toMatchObject({ statusCode: 400 });
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('G2-14 pricePerUnit & rateTiers', () => {
  test('pricePerUnit negatif → 400 (create & update)', async () => {
    await expect(svc.createJob(CAT, { name: 'Cuci', pricePerUnit: -5 })).rejects.toMatchObject({ statusCode: 400 });
    repo.findById.mockResolvedValue(job());
    await expect(svc.updateJob(CAT, 'j1', { pricePerUnit: 'abc' })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('pricePerUnit null = helper flat', async () => {
    repo.findById.mockResolvedValue(job());
    await svc.updateJob(CAT, 'j1', { pricePerUnit: null });
    expect(repo.update).toHaveBeenCalledWith('j1', expect.objectContaining({ pricePerUnit: null }), undefined);
  });

  test('rateTiers bukan array → 400', async () => {
    await expect(svc.createJob(CAT, { name: 'X', defaultCommissionType: 'FIXED', rateTiers: 'abc' }))
      .rejects.toMatchObject({ statusCode: 400 });
    await expect(svc.createJob(CAT, { name: 'X', defaultCommissionType: 'FIXED', rateTiers: [5] }))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('G2-06 ganti jenis tarif divalidasi terhadap nilai tersimpan', () => {
  test('FIXED 10000 → PERCENTAGE tanpa nilai baru → 400', async () => {
    repo.findById.mockResolvedValue(job({ defaultCommissionType: 'FIXED', defaultCommissionValue: '10000' }));
    await expect(svc.updateJob(CAT, 'j1', { defaultCommissionType: 'PERCENTAGE' }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(repo.update).not.toHaveBeenCalled();
  });

  test('tingkatan tersimpan > 100 ikut dicek saat ganti ke PERCENTAGE', async () => {
    repo.findById.mockResolvedValue(job({
      defaultCommissionType: 'FIXED', defaultCommissionValue: '10',
      rateTiers: [{ maxStaff: 3, value: '75000' }],
    }));
    await expect(svc.updateJob(CAT, 'j1', { defaultCommissionType: 'PERCENTAGE' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('ganti jenis + nilai & tingkatan baru yang valid → ok', async () => {
    repo.findById.mockResolvedValue(job({
      defaultCommissionType: 'FIXED', defaultCommissionValue: '10000',
      rateTiers: [{ maxStaff: 3, value: '75000' }],
    }));
    await svc.updateJob(CAT, 'j1', {
      defaultCommissionType: 'PERCENTAGE', defaultCommissionValue: 10, rateTiers: [{ maxStaff: null, value: 5 }],
    });
    expect(repo.update).toHaveBeenCalled();
  });
});

describe('G2-07 deductsFromJobId tidak boleh melingkar', () => {
  test('A → B, lalu B → A ditolak', async () => {
    const A = job({ id: 'A', deductsFromJobId: 'B' });
    const B = job({ id: 'B' });
    repo.findById.mockImplementation(async (id) => ({ A, B })[id] ?? null);
    await expect(svc.updateJob(CAT, 'B', { deductsFromJobId: 'A' })).rejects.toMatchObject({ statusCode: 400 });
    expect(repo.update).not.toHaveBeenCalled();
  });

  test('rantai tiga job A → B → C, lalu C → A ditolak', async () => {
    const jobs = { A: job({ id: 'A', deductsFromJobId: 'B' }), B: job({ id: 'B', deductsFromJobId: 'C' }), C: job({ id: 'C' }) };
    repo.findById.mockImplementation(async (id) => jobs[id] ?? null);
    await expect(svc.updateJob(CAT, 'C', { deductsFromJobId: 'A' })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('tanpa lingkaran → ok', async () => {
    const jobs = { A: job({ id: 'A' }), B: job({ id: 'B' }) };
    repo.findById.mockImplementation(async (id) => jobs[id] ?? null);
    await svc.updateJob(CAT, 'B', { deductsFromJobId: 'A' });
    expect(repo.update).toHaveBeenCalledWith('B', expect.objectContaining({ deductsFromJobId: 'A' }), undefined);
  });
});
