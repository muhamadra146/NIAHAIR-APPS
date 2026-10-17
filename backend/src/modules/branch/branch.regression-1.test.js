'use strict';

// Regression G5-02, G5-05/06, G5-07/08, G5-17 — found by API QA 2026-10-15
jest.mock('./branch.repository');
jest.mock('../../config/prisma', () => {
  const countModel = () => ({ count: jest.fn().mockResolvedValue(0) });
  // Sengaja TANPA branchCommissionRule (model sudah tidak ada)
  return {
    invoice: countModel(), appointment: countModel(), attendance: countModel(), staffSchedule: countModel(),
    deposit: countModel(), payment: countModel(), payroll: countModel(), itemPrice: countModel(),
  };
});

const { safeParse } = require('valibot');
const repo = require('./branch.repository');
const svc  = require('./branch.service');
const { createBranchSchema, updateBranchSchema, mapAccurateSchema } = require('./branch.validation');

const BRANCH = { id: 'b1', code: 'JKT', name: 'Jakarta', latitude: null, longitude: null };

beforeEach(() => {
  jest.clearAllMocks();
  repo.findById.mockResolvedValue(BRANCH);
  repo.findByCode.mockResolvedValue(null);
  repo.create.mockImplementation(async (d) => d);
  repo.update.mockImplementation(async (id, d) => ({ id, ...d }));
});

test('G5-02 hapus cabang tanpa relasi tidak lagi 500 (branchCommissionRule)', async () => {
  repo.countActiveEmployees.mockResolvedValue(0);
  repo.countAssignedWarehouses.mockResolvedValue(0);
  repo.hardDelete.mockResolvedValue(BRANCH);
  await expect(svc.deleteBranch('b1')).resolves.toEqual(BRANCH);
});

describe('G5-05/06 koordinat', () => {
  test.each([[{ latitude: 91, longitude: 0 }], [{ latitude: 0, longitude: -181 }], [{ latitude: 'x', longitude: 1 }]])(
    'skema menolak %j', (coords) => {
      expect(safeParse(createBranchSchema, { code: 'A', name: 'A', ...coords }).success).toBe(false);
      expect(safeParse(updateBranchSchema, coords).success).toBe(false);
    });

  test('latitude tanpa longitude → 400', async () => {
    await expect(svc.createBranch({ code: 'A', name: 'A', latitude: -6.2 })).rejects.toMatchObject({ statusCode: 400 });
    await expect(svc.updateBranch('b1', { latitude: -6.2 })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('update latitude saja bila longitude sudah tersimpan → ok', async () => {
    repo.findById.mockResolvedValue({ ...BRANCH, latitude: '-6.1', longitude: '106.8' });
    await svc.updateBranch('b1', { latitude: -6.2 });
    expect(repo.update).toHaveBeenCalled();
  });
});

describe('G5-07/08 mapping Accurate', () => {
  test.each([[{}], [{ accurateBranchId: 'abc' }], [{ accurateBranchId: 1.5 }], [{ accurateBranchId: -5 }], [{ accurateBranchId: 1e12 }], ['abc']])(
    '%j ditolak', (body) => {
      expect(safeParse(mapAccurateSchema, body).success).toBe(false);
    });
  test('bilangan bulat positif diterima', () => {
    expect(safeParse(mapAccurateSchema, { accurateBranchId: 50 }).success).toBe(true);
  });
});

describe('G5-17 nama & kode', () => {
  test('nama hanya spasi ditolak skema', () => {
    expect(safeParse(createBranchSchema, { code: 'A', name: '   ' }).success).toBe(false);
  });

  test('kode di-uppercase dan dicek tanpa beda huruf', async () => {
    repo.findByCode.mockResolvedValue({ id: 'other', code: 'JKT' });
    await expect(svc.createBranch({ code: ' jkt ', name: 'Jkt 2' })).rejects.toMatchObject({ statusCode: 409 });
    expect(repo.findByCode).toHaveBeenCalledWith('JKT');
  });

  test('kode baru disimpan huruf besar, nama di-trim', async () => {
    const r = await svc.createBranch({ code: 'bdg', name: ' Bandung ' });
    expect(r).toMatchObject({ code: 'BDG', name: 'Bandung' });
  });
});
