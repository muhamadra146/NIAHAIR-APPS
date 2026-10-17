'use strict';

// Regression: QA operasional 2026-10-17 — tanggal perbaikan komplain boleh sebelum tanggal booking;
// field wajib yang tidak dikirim menghasilkan "Invalid key: Expected …" (Inggris).
// Found by /qa on 2026-10-17

jest.mock('./complaint.repository', () => ({
  findById: jest.fn(), update: jest.fn(), create: jest.fn(), findMaxSeqToday: jest.fn().mockResolvedValue(0),
  findEmployeeBranchAccess: jest.fn(), findInvoiceById: jest.fn(),
}));
jest.mock('../../config/prisma', () => ({ appointment: { findUnique: jest.fn() } }));

const v      = require('valibot');
const repo   = require('./complaint.repository');
const prisma = require('../../config/prisma');
const svc    = require('./complaint.service');
const { createComplaintSchema } = require('./complaint.validation');

const VISIT = new Date('2026-10-20T00:00:00Z');

beforeEach(() => {
  jest.clearAllMocks();
  prisma.appointment.findUnique.mockResolvedValue({ id: 'a1', branchId: 'b1', customerId: 'c1', visitDate: VISIT });
  repo.findById.mockResolvedValue({ id: 'k1', status: 'OPEN', complaintNo: 'KMP-1', appointment: { visitDate: VISIT } });
  repo.create.mockResolvedValue({ id: 'k1' });
  repo.update.mockResolvedValue({ id: 'k1' });
});

const BAD = { statusCode: 422, message: 'Tanggal perbaikan tidak boleh sebelum tanggal booking' };
const BASE = { appointmentId: 'a1', category: 'HASIL_LAYANAN', description: 'x' };

test('buat: tanggal perbaikan sebelum tanggal booking ditolak', async () => {
  await expect(svc.create({ ...BASE, repairDate: '2026-10-19' }, 'u1')).rejects.toMatchObject(BAD);
  expect(repo.create).not.toHaveBeenCalled();
});

test('buat: tanggal perbaikan = tanggal booking diterima', async () => {
  await svc.create({ ...BASE, repairDate: '2026-10-20' }, 'u1');
  expect(repo.create).toHaveBeenCalled();
});

test('ubah: tanggal perbaikan sebelum tanggal booking ditolak', async () => {
  await expect(svc.updateComplaint('k1', { repairDate: '2026-10-01' }, 'u1')).rejects.toMatchObject(BAD);
  expect(repo.update).not.toHaveBeenCalled();
});

test('ubah: tanggal perbaikan setelah booking diterima', async () => {
  await svc.updateComplaint('k1', { repairDate: '2026-10-25' }, 'u1');
  expect(repo.update).toHaveBeenCalled();
});

test('field wajib tidak dikirim → pesan Bahasa Indonesia', () => {
  const r = v.safeParse(createComplaintSchema, {});
  expect(r.issues.map((i) => i.message)).toEqual(['Booking wajib dipilih', 'Kategori wajib dipilih', 'Deskripsi wajib diisi']);
  expect(v.safeParse(createComplaintSchema, { ...BASE, category: 'X' }).issues[0].message).toBe('Kategori tidak valid');
});
