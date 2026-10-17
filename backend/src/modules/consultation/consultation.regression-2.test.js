'use strict';

// Regression: QA operasional 2026-10-17
//   C1 — hak akses Catatan Klien terbalik (Finance bisa ubah/hapus semua, Kasir ditolak)
//   C2 — mengedit catatan menimpa penulis & tanggal isi asli (CRM-008)
//   UX — pilihan "Lainnya" tersimpan tanpa keterangan
// Keputusan owner 2026-10-17: buat = SA/Owner/Manager/Kasir (+ staf yang menangani invoice);
// ubah/hapus = penulis atau SA/Owner/Manager; Finance hanya lihat.
// Found by /qa on 2026-10-17

jest.mock('./consultation.repository');
jest.mock('../../config/prisma', () => ({ invoice: { findUnique: jest.fn() } }));
jest.mock('../../config/cloudinary', () => ({ uploader: { destroy: jest.fn().mockResolvedValue() } }));
jest.mock('../../middlewares/role.middleware', () => jest.fn((...roles) => {
  const mw = (req, res, next) => next();
  mw.roles = roles;
  return mw;
}));
jest.mock('../../middlewares/uploadConsultationNote.middleware', () => ({ single: () => (req, res, next) => next() }));
jest.mock('./consultation.controller', () => new Proxy({}, { get: () => (req, res) => res.end() }));

const repo   = require('./consultation.repository');
const prisma = require('../../config/prisma');
const svc    = require('./consultation.service');
const router = require('./consultation.route');

const FILLED_AT = new Date('2026-10-10T03:00:00Z');
const NOTE = {
  id: 'n1', invoiceId: 'inv1', customerId: 'c1', branchId: 'b1',
  filledByEmployeeId: 'eAuthor', filledAt: FILLED_AT, interestingNote: 'Asli',
};

const user = (roleCode, employeeId = 'eOther') => ({ roleCode, employeeId });

beforeEach(() => {
  jest.clearAllMocks();
  prisma.invoice.findUnique.mockResolvedValue({ id: 'inv1', customerId: 'c1', branchId: 'b1', status: 'PAID' });
  repo.findByInvoiceId.mockResolvedValue(null);
  repo.findById.mockResolvedValue(NOTE);
  repo.isEmployeeAssignedToInvoice.mockResolvedValue(false);
  repo.create.mockResolvedValue(NOTE);
  repo.update.mockResolvedValue(NOTE);
  repo.remove.mockResolvedValue();
});

describe('C1 — membuat catatan', () => {
  test.each(['SUPER_ADMIN', 'OWNER', 'MANAGER', 'CASHIER'])('%s boleh tanpa harus ditugaskan di invoice', async (role) => {
    await svc.createNote({ invoiceId: 'inv1', interestingNote: 'x' }, user(role));
    expect(repo.create).toHaveBeenCalled();
    expect(repo.isEmployeeAssignedToInvoice).not.toHaveBeenCalled();
  });

  test.each(['FINANCE', 'OFFICE', 'INVENTORY'])('%s ditolak (hanya lihat)', async (role) => {
    await expect(svc.createNote({ invoiceId: 'inv1', interestingNote: 'x' }, user(role)))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(repo.create).not.toHaveBeenCalled();
  });

  test('STAFF_OPERASIONAL hanya bila menangani invoice', async () => {
    await expect(svc.createNote({ invoiceId: 'inv1', interestingNote: 'x' }, user('STAFF_OPERASIONAL')))
      .rejects.toMatchObject({ statusCode: 403 });
    repo.isEmployeeAssignedToInvoice.mockResolvedValue(true);
    await svc.createNote({ invoiceId: 'inv1', interestingNote: 'x' }, user('STAFF_OPERASIONAL'));
    expect(repo.create).toHaveBeenCalled();
  });
});

describe('C1 — ubah / hapus / foto', () => {
  const actions = {
    update: (u) => svc.updateNote('n1', { interestingNote: 'Baru' }, u),
    delete: (u) => svc.deleteNote('n1', u),
    photo:  (u) => svc.uploadNotePhoto('n1', { url: 'http://x', publicId: 'p', type: 'BEFORE' }, u),
  };

  test.each(Object.keys(actions))('%s: penulis catatan (Kasir/Staf) boleh', async (a) => {
    await expect(actions[a](user('CASHIER', 'eAuthor'))).resolves.not.toBeInstanceOf(Error);
    await expect(actions[a](user('STAFF_OPERASIONAL', 'eAuthor'))).resolves.not.toBeInstanceOf(Error);
  });

  test.each(Object.keys(actions))('%s: Kasir/Staf bukan penulis ditolak walau terkait invoice', async (a) => {
    repo.isEmployeeAssignedToInvoice.mockResolvedValue(true);
    await expect(actions[a](user('CASHIER'))).rejects.toMatchObject({ statusCode: 403 });
    await expect(actions[a](user('STAFF_OPERASIONAL'))).rejects.toMatchObject({ statusCode: 403 });
  });

  test.each(Object.keys(actions))('%s: SA/Owner/Manager boleh untuk catatan siapa pun', async (a) => {
    for (const role of ['SUPER_ADMIN', 'OWNER', 'MANAGER']) await actions[a](user(role));
  });

  test.each(Object.keys(actions))('%s: FINANCE & OFFICE ditolak walau penulis', async (a) => {
    await expect(actions[a](user('FINANCE', 'eAuthor'))).rejects.toMatchObject({ statusCode: 403 });
    await expect(actions[a](user('OFFICE', 'eAuthor'))).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('C2 — edit tidak menimpa penulis & tanggal isi', () => {
  test('update hanya mengirim isi catatan', async () => {
    await svc.updateNote('n1', { interestingNote: 'Baru', invoiceId: 'invLain' }, user('MANAGER', 'eManager'));
    const data = repo.update.mock.calls[0][1];
    expect(data).toEqual({ interestingNote: 'Baru' });
    expect(data).not.toHaveProperty('filledByEmployeeId');
    expect(data).not.toHaveProperty('filledAt');
  });
});

describe('Pilihan "Lainnya" wajib keterangan', () => {
  test('profesi Lainnya tanpa keterangan ditolak saat dibuat', async () => {
    await expect(svc.createNote({ invoiceId: 'inv1', interestingNote: 'x', profession: 'OTHER' }, user('MANAGER')))
      .rejects.toMatchObject({ statusCode: 422, message: 'Pilihan "Lainnya" pada Profesi wajib diisi keterangannya' });
  });

  test('pilihan ganda berisi Lainnya tanpa keterangan ditolak saat diubah', async () => {
    await expect(svc.updateNote('n1', { hesitation: ['TAKUT_SAKIT', 'OTHER'] }, user('MANAGER')))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  test('Lainnya dengan keterangan diterima', async () => {
    await svc.createNote({ invoiceId: 'inv1', interestingNote: 'x', profession: 'OTHER', professionOther: 'Dokter' }, user('MANAGER'));
    expect(repo.create).toHaveBeenCalled();
  });
});

describe('Route — hak akses', () => {
  const rolesFor = (method, path) => {
    const layer = router.stack.find((l) => l.route?.path === path && l.route.methods[method]);
    return layer.route.stack.map((s) => s.handle.roles).find(Boolean) ?? null;
  };

  test.each([['get', '/'], ['get', '/:id'], ['get', '/unfilled-invoices'], ['get', '/invoice/:invoiceId']])(
    '%s %s menolak INVENTORY', (method, path) => {
      expect(rolesFor(method, path)).not.toContain('INVENTORY');
      expect(rolesFor(method, path)).toEqual(expect.arrayContaining(['CASHIER', 'STAFF_OPERASIONAL', 'OFFICE', 'FINANCE']));
    });

  test.each([['post', '/'], ['patch', '/:id'], ['patch', '/:id/photos'], ['delete', '/:id']])(
    '%s %s menolak FINANCE, OFFICE, INVENTORY', (method, path) => {
      expect(rolesFor(method, path)).toEqual(['SUPER_ADMIN', 'OWNER', 'MANAGER', 'CASHIER', 'STAFF_OPERASIONAL']);
    });
});
