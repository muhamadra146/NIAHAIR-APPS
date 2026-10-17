'use strict';

// Regression: QA operasional 2026-10-17
//   R1/R2b — OFFICE & STAFF_OPERASIONAL bisa membuat deposit lewat API; INVENTORY bisa membaca deposit
//   D1     — Tambah Deposit menerima tanggal di masa depan
// Found by /qa on 2026-10-17

jest.mock('../../middlewares/role.middleware', () => jest.fn((...roles) => {
  const mw = (req, res, next) => next();
  mw.roles = roles;
  return mw;
}));
jest.mock('./deposit.controller', () => new Proxy({}, { get: () => (req, res) => res.end() }));
jest.mock('./deposit.repository', () => ({
  findCustomerById: jest.fn(), findAppointmentById: jest.fn(), create: jest.fn(),
}));
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));
jest.mock('./deposit.sync.service', () => ({ updateDepositInAccurate: jest.fn(), deleteDepositFromAccurate: jest.fn() }));
jest.mock('../../config/prisma', () => ({}));

const router = require('./deposit.route');
const repo   = require('./deposit.repository');
const { createDeposit } = require('./deposit.service');
const { wibDateStr } = require('../../utils/date');

const rolesFor = (method, path) => {
  const layer = router.stack.find((l) => l.route?.path === path && l.route.methods[method]);
  return layer.route.stack.map((s) => s.handle.roles).find(Boolean) ?? null;
};

describe('R1/R2b — hak akses deposit', () => {
  test('POST / hanya POS (FIN-012) — OFFICE & STAFF_OPERASIONAL ditolak', () => {
    expect(rolesFor('post', '/')).toEqual(['SUPER_ADMIN', 'OWNER', 'MANAGER', 'CASHIER']);
  });

  test.each([['get', '/'], ['get', '/:id'], ['get', '/summary']])('%s %s menolak INVENTORY', (method, path) => {
    const roles = rolesFor(method, path);
    expect(roles).not.toContain('INVENTORY');
    expect(roles).toEqual(expect.arrayContaining(['SUPER_ADMIN', 'OWNER', 'MANAGER', 'CASHIER', 'OFFICE', 'FINANCE']));
  });

  test('daftar & detail tetap terbuka untuk STAFF_OPERASIONAL (tab DP di Detail Booking)', () => {
    expect(rolesFor('get', '/')).toContain('STAFF_OPERASIONAL');
    expect(rolesFor('get', '/:id')).toContain('STAFF_OPERASIONAL');
  });
});

describe('D1 — tanggal deposit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    repo.findCustomerById.mockResolvedValue({ id: 'c1' });
    repo.create.mockImplementation(async (data) => ({ id: 'd1', ...data, invoiceDeposits: [] }));
  });

  test('tanggal setelah hari ini (WIB) ditolak', async () => {
    await expect(createDeposit({ customerId: 'c1', amount: 100000, paidAt: '2099-01-01', branchId: 'b1' }))
      .rejects.toMatchObject({ statusCode: 422, message: 'Tanggal deposit tidak boleh setelah hari ini' });
    expect(repo.create).not.toHaveBeenCalled();
  });

  test('tanggal hari ini (WIB) diterima', async () => {
    await createDeposit({ customerId: 'c1', amount: 100000, paidAt: wibDateStr(), branchId: 'b1' });
    expect(repo.create).toHaveBeenCalled();
  });

  test('tanpa tanggal tetap diterima', async () => {
    await createDeposit({ customerId: 'c1', amount: 100000, branchId: 'b1' });
    expect(repo.create).toHaveBeenCalled();
  });
});
