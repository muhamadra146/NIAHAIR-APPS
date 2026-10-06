'use strict';

// Regression: ISSUE-001 — paket membership dengan diskon persen > 100% diterima
// Found by /qa on 2026-10-06
// Report: .gstack/qa-reports/qa-report-localhost-2026-10-06.md

jest.mock('./membership.repository');
jest.mock('../../config/prisma', () => ({}));

const repo = require('./membership.repository');
const svc  = require('./membership.service');

const BASE = { name: 'Gold', price: 500000, durationDays: 365 };

beforeEach(() => jest.clearAllMocks());

describe('create — batas diskon persen', () => {
  test('menolak diskon PERCENTAGE 150', async () => {
    await expect(svc.create({ ...BASE, discountType: 'PERCENTAGE', discountValue: 150 }))
      .rejects.toThrow('Diskon persen tidak boleh lebih dari 100%');
    expect(repo.create).not.toHaveBeenCalled();
  });

  test('menerima diskon PERCENTAGE tepat 100', async () => {
    repo.create.mockResolvedValue({ id: 'm1' });
    await svc.create({ ...BASE, discountType: 'PERCENTAGE', discountValue: 100 });
    expect(repo.create).toHaveBeenCalled();
  });

  test('FIXED_AMOUNT boleh di atas 100', async () => {
    repo.create.mockResolvedValue({ id: 'm1' });
    await svc.create({ ...BASE, discountType: 'FIXED_AMOUNT', discountValue: 50000 });
    expect(repo.create).toHaveBeenCalled();
  });
});

describe('update — batas diskon persen memakai nilai lama', () => {
  test('menolak ganti tipe ke PERCENTAGE saat nilai lama 50000', async () => {
    repo.findById.mockResolvedValue({ id: 'm1', ...BASE, discountType: 'FIXED_AMOUNT', discountValue: 50000 });
    await expect(svc.update('m1', { discountType: 'PERCENTAGE' }))
      .rejects.toThrow('Diskon persen tidak boleh lebih dari 100%');
    expect(repo.update).not.toHaveBeenCalled();
  });

  test('menolak nilai 120 saat tipe lama PERCENTAGE', async () => {
    repo.findById.mockResolvedValue({ id: 'm1', ...BASE, discountType: 'PERCENTAGE', discountValue: 10 });
    await expect(svc.update('m1', { discountValue: 120 })).rejects.toThrow();
  });
});
