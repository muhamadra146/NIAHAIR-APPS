'use strict';

// Regression: QA operasional 2026-10-17
//   B1     — Ubah status ke Dibatalkan gagal "cancelReason is required when cancelling" (Inggris)
//   R1/R2b — OFFICE & STAFF_OPERASIONAL bisa membuat booking lewat API; INVENTORY bisa membaca booking
//   UX-CRM — pesan Inggris ("Cannot transition from…", "No fields to update", "Invalid key: Expected…")
// Found by /qa on 2026-10-17

jest.mock('./appointment.repository');
jest.mock('../../config/prisma', () => ({ invoice: { findFirst: jest.fn() } }));
jest.mock('../../config/cloudinary', () => ({ uploader: { destroy: jest.fn() } }));
jest.mock('../../middlewares/role.middleware', () => jest.fn((...roles) => {
  const mw = (req, res, next) => next();
  mw.roles = roles;
  return mw;
}));
jest.mock('./appointment.controller', () => new Proxy({}, { get: () => (req, res) => res.end() }));

const v      = require('valibot');
const repo   = require('./appointment.repository');
const svc    = require('./appointment.service');
const router = require('./appointment.route');
const { createAppointmentSchema, changeStatusSchema, rescheduleSchema } = require('./appointment.validation');

const rolesFor = (method, path) => {
  const layer = router.stack.find((l) => l.route?.path === path && l.route.methods[method]);
  return layer.route.stack.map((s) => s.handle.roles).find(Boolean) ?? null;
};

const APPOINTMENT = {
  id: 'apt1', customerId: 'c1', branchId: 'b1', status: 'BOOKED',
  visitDate: new Date('2026-10-20T00:00:00Z'),
  startTime: new Date('2026-10-20T09:00:00+07:00'),
  endTime:   new Date('2026-10-20T11:00:00+07:00'),
};

beforeEach(() => {
  jest.clearAllMocks();
  repo.findById.mockResolvedValue(APPOINTMENT);
  repo.changeStatusWithTransaction.mockResolvedValue({ ...APPOINTMENT, status: 'CANCELLED' });
});

describe('B1 — pembatalan booking', () => {
  test('tanpa alasan ditolak dengan pesan Bahasa Indonesia', async () => {
    await expect(svc.changeAppointmentStatus('apt1', { status: 'CANCELLED' }, 'u1'))
      .rejects.toMatchObject({ statusCode: 422, message: 'Alasan pembatalan wajib diisi' });
  });

  test('alasan hanya spasi tetap ditolak', async () => {
    await expect(svc.changeAppointmentStatus('apt1', { status: 'CANCELLED', cancelReason: '   ' }, 'u1'))
      .rejects.toMatchObject({ message: 'Alasan pembatalan wajib diisi' });
  });

  test('dengan alasan berhasil dan alasan diteruskan ke repository', async () => {
    await svc.changeAppointmentStatus('apt1', { status: 'CANCELLED', cancelReason: 'Pelanggan sakit' }, 'u1');
    expect(repo.changeStatusWithTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ newStatus: 'CANCELLED', cancelReason: 'Pelanggan sakit' })
    );
  });
});

describe('UX-CRM — pesan error Bahasa Indonesia', () => {
  test('transisi tidak valid', async () => {
    repo.findById.mockResolvedValue({ ...APPOINTMENT, status: 'NO_SHOW' });
    await expect(svc.changeAppointmentStatus('apt1', { status: 'CONFIRMED' }, 'u1'))
      .rejects.toMatchObject({ message: 'Status booking tidak bisa diubah dari Tidak Datang ke Confirmed' });
  });

  test('update tanpa field', async () => {
    await expect(svc.updateAppointmentById('apt1', {}, 'u1'))
      .rejects.toMatchObject({ message: 'Tidak ada data yang diubah' });
  });

  test('field wajib yang tidak dikirim tidak menghasilkan "Invalid key"', () => {
    const r = v.safeParse(createAppointmentSchema, {});
    const messages = r.issues.map((i) => i.message);
    expect(messages).toEqual([
      'Pelanggan wajib dipilih', 'Tanggal kunjungan wajib diisi', 'Jam mulai wajib diisi', 'Jam selesai wajib diisi',
    ]);
  });

  test('jam kosong → "wajib diisi", bukan pesan format', () => {
    const r = v.safeParse(rescheduleSchema, { visitDate: '2026-10-20', startTime: '', endTime: '10:00', reason: 'x' });
    expect(r.issues.map((i) => i.message)).toEqual(['Jam mulai wajib diisi']);
  });

  test('jam format salah tetap ditolak', () => {
    const r = v.safeParse(rescheduleSchema, { visitDate: '2026-10-20', startTime: '25:00', endTime: '10:00', reason: 'x' });
    expect(r.issues.map((i) => i.message)).toEqual(['Jam mulai harus format JJ:MM (mis. 09:00)']);
  });

  test('status wajib & harus valid', () => {
    expect(v.safeParse(changeStatusSchema, {}).issues[0].message).toBe('Status baru wajib dipilih');
    expect(v.safeParse(changeStatusSchema, { status: 'RESCHEDULE' }).issues[0].message).toBe('Status booking tidak valid');
    expect(v.safeParse(changeStatusSchema, { status: 'NO_SHOW' }).success).toBe(true);
  });
});

describe('R1/R2b — hak akses booking mengikuti menu', () => {
  const WRITE = ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'CASHIER'];

  test.each([
    ['post',  '/'],
    ['patch', '/:id'],
    ['patch', '/:id/status'],
    ['patch', '/:id/reschedule'],
    ['patch', '/:id/reschedule/:historyId'],
  ])('%s %s hanya POS (OFFICE, STAFF_OPERASIONAL, FINANCE view-only)', (method, path) => {
    expect(rolesFor(method, path)).toEqual(WRITE);
  });

  test.each([['get', '/'], ['get', '/:id']])('%s %s: INVENTORY ditolak, staf & view-only tetap bisa baca', (method, path) => {
    const roles = rolesFor(method, path);
    expect(roles).not.toContain('INVENTORY');
    expect(roles).toEqual(expect.arrayContaining([...WRITE, 'STAFF_OPERASIONAL', 'OFFICE', 'FINANCE']));
  });
});
