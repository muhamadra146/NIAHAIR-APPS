'use strict';

// Regression: G1-20 — komplain: branchId dari body tanpa cek akses cabang, invoice milik pelanggan lain
// diterima, dan correctedStrands > totalStrands diterima (potongan komisi > 100%).
// Found by /qa on 2026-10-15

jest.mock('./complaint.repository', () => ({
  findMaxSeqToday:          jest.fn().mockResolvedValue(0),
  findById:                 jest.fn(),
  create:                   jest.fn(),
  update:                   jest.fn(),
  findInvoiceById:          jest.fn(),
  findEmployeeBranchAccess: jest.fn(),
}));
jest.mock('../../config/prisma', () => ({
  appointment: { findUnique: jest.fn() },
  commission:  { findUnique: jest.fn(), update: jest.fn() },
}));

const repo   = require('./complaint.repository');
const prisma = require('../../config/prisma');
const svc    = require('./complaint.service');

const BODY    = { appointmentId: 'a1', category: 'HASIL_LAYANAN', description: 'x' };
const CASHIER = { roleCode: 'CASHIER', employeeId: 'e1' };

beforeEach(() => {
  jest.clearAllMocks();
  prisma.appointment.findUnique.mockResolvedValue({ id: 'a1', branchId: 'b1', customerId: 'c1' });
});

describe('create', () => {
  test('branchId cabang tanpa akses → 403', async () => {
    repo.findEmployeeBranchAccess.mockResolvedValue(null);
    await expect(svc.create({ ...BODY, branchId: 'b9' }, 'u1', CASHIER)).rejects.toMatchObject({ statusCode: 403 });
    expect(repo.create).not.toHaveBeenCalled();
  });

  test('invoice milik pelanggan lain → 422', async () => {
    repo.findInvoiceById.mockResolvedValue({ id: 'inv1', customerId: 'c2' });
    await expect(svc.create({ ...BODY, invoiceId: 'inv1' }, 'u1', CASHIER)).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.create).not.toHaveBeenCalled();
  });

  test('invoice tidak ada → 404', async () => {
    repo.findInvoiceById.mockResolvedValue(null);
    await expect(svc.create({ ...BODY, invoiceId: 'nope' }, 'u1', CASHIER)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('data konsisten → dibuat', async () => {
    repo.findEmployeeBranchAccess.mockResolvedValue({ id: 'eb1' });
    repo.findInvoiceById.mockResolvedValue({ id: 'inv1', customerId: 'c1' });
    await svc.create({ ...BODY, branchId: 'b1', invoiceId: 'inv1' }, 'u1', CASHIER);
    expect(repo.create).toHaveBeenCalled();
  });
});

describe('updateComplaint', () => {
  test('correctedStrands > totalStrands → 422, komisi tidak dipotong', async () => {
    repo.findById.mockResolvedValue({ id: 'k1', status: 'IN_PROGRESS', complaintNo: 'KMP-1' });
    await expect(svc.updateComplaint('k1', { status: 'RESOLVED', correctedStrands: 150, totalStrands: 100, commissionId: 'cm1' }, 'u1'))
      .rejects.toMatchObject({ statusCode: 422 });
    expect(prisma.commission.update).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });
});
