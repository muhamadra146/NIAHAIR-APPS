'use strict';

// Regression: G1-10 — booking menerima jam selesai sebelum (atau sama dengan) jam mulai
// pada create, update, dan reschedule.
// Found by /qa on 2026-10-15

jest.mock('./appointment.repository');
jest.mock('../../config/prisma', () => ({}));
jest.mock('../../config/cloudinary', () => ({ uploader: { destroy: jest.fn() } }));

const repo = require('./appointment.repository');
const svc  = require('./appointment.service');

// 09:00–11:00 WIB
const APPOINTMENT = {
  id: 'apt1', customerId: 'c1', branchId: 'b1', status: 'BOOKED',
  visitDate: new Date('2026-10-20T00:00:00Z'),
  startTime: new Date('2026-10-20T09:00:00+07:00'),
  endTime:   new Date('2026-10-20T11:00:00+07:00'),
  rescheduleHistories: [{ id: 'h1' }],
};

beforeEach(() => {
  jest.clearAllMocks();
  repo.findById.mockResolvedValue(APPOINTMENT);
  repo.findCustomerById.mockResolvedValue({ id: 'c1' });
  repo.findBranchById.mockResolvedValue({ id: 'b1' });
});

const BAD = { message: 'Jam selesai harus setelah jam mulai', statusCode: 422 };

test('create: endTime < startTime → 422', async () => {
  await expect(svc.createAppointment({ customerId: 'c1', branchId: 'b1', visitDate: '2026-10-20', startTime: '12:00', endTime: '11:00' }, 'u1'))
    .rejects.toMatchObject(BAD);
  expect(repo.createWithTransaction).not.toHaveBeenCalled();
});

test('create: endTime = startTime → 422', async () => {
  await expect(svc.createAppointment({ customerId: 'c1', branchId: 'b1', visitDate: '2026-10-20', startTime: '10:00', endTime: '10:00' }, 'u1'))
    .rejects.toMatchObject(BAD);
});

test('update: hanya endTime, lebih awal dari startTime tersimpan (09:00) → 422', async () => {
  await expect(svc.updateAppointmentById('apt1', { endTime: '08:30' }, 'u1')).rejects.toMatchObject(BAD);
  expect(repo.updateWithStaff).not.toHaveBeenCalled();
});

test('update: hanya startTime, setelah endTime tersimpan (11:00) → 422', async () => {
  await expect(svc.updateAppointmentById('apt1', { startTime: '11:30' }, 'u1')).rejects.toMatchObject(BAD);
});

test('update: startTime 10:00 (sebelum 11:00 tersimpan) → diterima', async () => {
  repo.updateWithStaff.mockResolvedValue(APPOINTMENT);
  await svc.updateAppointmentById('apt1', { startTime: '10:00' }, 'u1');
  expect(repo.updateWithStaff).toHaveBeenCalled();
});

test('reschedule: endTime < startTime → 422', async () => {
  await expect(svc.rescheduleAppointment('apt1', { visitDate: '2026-10-21', startTime: '14:00', endTime: '13:00', reason: 'x' }, 'u1'))
    .rejects.toMatchObject(BAD);
  expect(repo.rescheduleWithTransaction).not.toHaveBeenCalled();
});

test('ubah reschedule: endTime < startTime → 422', async () => {
  await expect(svc.updateRescheduleById('apt1', 'h1', { visitDate: '2026-10-21', startTime: '14:00', endTime: '13:00', reason: 'x' }))
    .rejects.toMatchObject(BAD);
});
