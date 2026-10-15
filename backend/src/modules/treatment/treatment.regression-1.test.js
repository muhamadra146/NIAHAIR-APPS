'use strict';

// Regression: G1-13 — POST /treatment-sessions: branchId dari body tanpa cek akses cabang,
// dan booking milik pelanggan lain diterima.
// Found by /qa on 2026-10-15

jest.mock('./treatment.repository');
jest.mock('../invoice/invoice.sync.service', () => ({ syncInvoiceToAccurate: jest.fn() }));
jest.mock('../../config/prisma', () => ({}));

const repo = require('./treatment.repository');
const svc  = require('./treatment.service');

const BODY    = { customerId: 'c1', branchId: 'b2' };
const CASHIER = { roleCode: 'CASHIER', employeeId: 'e1' };

beforeEach(() => {
  jest.clearAllMocks();
  repo.findCustomerById.mockResolvedValue({ id: 'c1' });
  repo.findBranchById.mockResolvedValue({ id: 'b2' });
  repo.create.mockResolvedValue({ id: 'ts1' });
});

test('cabang tanpa akses → 403, sesi tidak dibuat', async () => {
  repo.findEmployeeBranchAccess.mockResolvedValue(null);
  await expect(svc.createSession(BODY, CASHIER)).rejects.toMatchObject({ statusCode: 403 });
  expect(repo.findEmployeeBranchAccess).toHaveBeenCalledWith('e1', 'b2');
  expect(repo.create).not.toHaveBeenCalled();
});

test('user tanpa profil karyawan → 403', async () => {
  await expect(svc.createSession(BODY, { roleCode: 'MANAGER', employeeId: null })).rejects.toMatchObject({ statusCode: 403 });
  expect(repo.create).not.toHaveBeenCalled();
});

test('SUPER_ADMIN boleh cabang mana pun', async () => {
  await svc.createSession(BODY, { roleCode: 'SUPER_ADMIN' });
  expect(repo.findEmployeeBranchAccess).not.toHaveBeenCalled();
  expect(repo.create).toHaveBeenCalled();
});

test('booking milik pelanggan lain → 422', async () => {
  repo.findEmployeeBranchAccess.mockResolvedValue({ id: 'eb1' });
  repo.findAppointmentById.mockResolvedValue({ id: 'a1', customerId: 'c2' });
  await expect(svc.createSession({ ...BODY, appointmentId: 'a1' }, CASHIER)).rejects.toMatchObject({ statusCode: 422 });
  expect(repo.create).not.toHaveBeenCalled();
});

test('akses cabang ada & booking milik pelanggan → dibuat', async () => {
  repo.findEmployeeBranchAccess.mockResolvedValue({ id: 'eb1' });
  repo.findAppointmentById.mockResolvedValue({ id: 'a1', customerId: 'c1' });
  await svc.createSession({ ...BODY, appointmentId: 'a1' }, CASHIER);
  expect(repo.create).toHaveBeenCalled();
});
