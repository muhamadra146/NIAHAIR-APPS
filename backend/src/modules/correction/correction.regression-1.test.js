'use strict';

// Regression: QA Kehadiran 2026-10-19
//   · Alasan koreksi berisi spasi saja diterima → harus ditolak
//   · Pesan validasi Valibot berbahasa Inggris → Bahasa Indonesia
//   · Menyetujui koreksi selalu gagal ("Alasan absensi manual wajib diisi") karena manualSet
//     dipanggil tanpa catatan — diuji end-to-end dengan attendance.service asli

jest.mock('./correction.repository');
jest.mock('../notification/notification.service', () => ({ requestCreated: jest.fn(), requestDecided: jest.fn() }));
jest.mock('../attendance/attendance.repository', () => ({ findBySchedule: jest.fn(), upsertBySchedule: jest.fn() }));
jest.mock('../division/division.repository', () => ({ findEmployeeScope: jest.fn() }));
jest.mock('../../config/prisma', () => ({ staffSchedule: { findUnique: jest.fn() } }));

const { safeParse } = require('valibot');
const repo     = require('./correction.repository');
const attRepo  = require('../attendance/attendance.repository');
const prisma   = require('../../config/prisma');
const { wibDateStr } = require('../../utils/date');
const svc      = require('./correction.service');
const { createCorrectionSchema, reviewCorrectionSchema } = require('./correction.validation');

const todayStr = wibDateStr(new Date());
const at = (hhmm) => new Date(`${todayStr}T${hhmm}:00+07:00`);

beforeEach(() => jest.clearAllMocks());

describe('validasi koreksi', () => {
  test('alasan spasi saja ditolak, alasan dipangkas', () => {
    const r = safeParse(createCorrectionSchema, { staffScheduleId: 'ss1', reason: '   ' });
    expect(r.success).toBe(false);
    expect(r.issues[0].message).toBe('Alasan wajib diisi');
    const ok = safeParse(createCorrectionSchema, { staffScheduleId: 'ss1', reason: '  lupa  ' });
    expect(ok.output.reason).toBe('lupa');
  });

  test('pesan error berbahasa Indonesia', () => {
    for (const [schema, body] of [
      [createCorrectionSchema, {}],
      [createCorrectionSchema, { staffScheduleId: 'ss1', reason: 'x', requestedCheckIn: 'bukan-jam' }],
      [reviewCorrectionSchema, { status: 'NGAWUR' }],
      [reviewCorrectionSchema, null],
    ]) {
      const r = safeParse(schema, body);
      expect(r.success).toBe(false);
      for (const i of r.issues) expect(i.message).not.toMatch(/Invalid|Expected/);
    }
  });
});

describe('persetujuan koreksi (attendance.service asli)', () => {
  const SCHED = { id: 'ss1', employeeId: 'e1', branchId: 'b1', workDate: new Date(`${todayStr}T00:00:00Z`), status: 'WORKING', shift: { startTime: '09:00', endTime: '18:00' } };

  test('koreksi jam masuk saja: berhasil, catatan = alasan, jam keluar lama tetap', async () => {
    repo.findById.mockResolvedValue({
      id: 'cr1', status: 'PENDING', employeeId: 'e1', staffScheduleId: 'ss1', reason: 'Lupa absen',
      requestedCheckIn: at('09:00'), requestedCheckOut: null,
    });
    repo.update.mockImplementation(async (_id, d) => ({ id: 'cr1', employeeId: 'e1', ...d }));
    prisma.staffSchedule.findUnique.mockResolvedValue(SCHED);
    attRepo.findBySchedule.mockResolvedValue({ checkInAt: at('10:30'), checkOutAt: at('18:00') });
    attRepo.upsertBySchedule.mockImplementation(async (_id, create) => create);

    const r = await svc.review('cr1', 'u-sa', { status: 'APPROVED' }, { id: 'u-sa', roleCode: 'SUPER_ADMIN' });

    expect(r.status).toBe('APPROVED');
    const [, created, updated] = attRepo.upsertBySchedule.mock.calls[0];
    expect(updated.notes).toBe('Koreksi disetujui: Lupa absen');
    expect(updated.checkInAt.toISOString()).toBe(at('09:00').toISOString());
    expect(updated.checkOutAt.toISOString()).toBe(at('18:00').toISOString());
    expect(updated.status).toBe('PRESENT');
    expect(created.employeeId).toBe('e1');
  });

  test('koreksi gagal diterapkan → status pengajuan tetap PENDING', async () => {
    repo.findById.mockResolvedValue({
      id: 'cr1', status: 'PENDING', employeeId: 'e1', staffScheduleId: 'ss1', reason: 'x',
      requestedCheckIn: null, requestedCheckOut: at('18:00'),
    });
    prisma.staffSchedule.findUnique.mockResolvedValue(SCHED);
    attRepo.findBySchedule.mockResolvedValue(null); // belum ada jam masuk sama sekali

    await expect(svc.review('cr1', 'u-sa', { status: 'APPROVED' }, { id: 'u-sa', roleCode: 'SUPER_ADMIN' }))
      .rejects.toMatchObject({ statusCode: 422 });
    expect(repo.update).not.toHaveBeenCalled();
  });
});
