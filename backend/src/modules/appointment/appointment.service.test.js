'use strict';

jest.mock('./appointment.repository');
jest.mock('../../config/prisma', () => ({ appointment: { count: jest.fn() } }));

const repo = require('./appointment.repository');
const svc  = require('./appointment.service');

const APPOINTMENT = {
  id: 'apt1', bookingNo: 'BKG-20240101-0001',
  customerId: 'c1', branchId: 'b1',
  status: 'BOOKED',
  visitDate: new Date('2024-06-01'),
  startTime: new Date('2024-06-01T09:00:00'),
  endTime:   new Date('2024-06-01T11:00:00'),
};

beforeEach(() => jest.clearAllMocks());

// ── listAppointments ───────────────────────────────────────────────────

describe('listAppointments', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([APPOINTMENT]);
    repo.count.mockResolvedValue(1);

    const result = await svc.listAppointments({ page: 1, limit: 10 });
    expect(result.appointments).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getAppointmentById ─────────────────────────────────────────────────

describe('getAppointmentById', () => {
  test('returns appointment when found', async () => {
    repo.findById.mockResolvedValue(APPOINTMENT);
    await expect(svc.getAppointmentById('apt1')).resolves.toEqual(APPOINTMENT);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getAppointmentById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createAppointment ──────────────────────────────────────────────────

describe('createAppointment', () => {
  const BODY = {
    customerId: 'c1', branchId: 'b1',
    visitDate: '2024-06-01', startTime: '09:00', endTime: '11:00',
  };

  beforeEach(() => {
    repo.findCustomerById.mockResolvedValue({ id: 'c1' });
    repo.findBranchById.mockResolvedValue({ id: 'b1' });
    repo.countToday.mockResolvedValue(0);
    repo.createWithTransaction.mockResolvedValue(APPOINTMENT);
  });

  test('throws 404 when customer not found', async () => {
    repo.findCustomerById.mockResolvedValue(null);
    await expect(svc.createAppointment(BODY)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 404 when branch not found', async () => {
    repo.findBranchById.mockResolvedValue(null);
    await expect(svc.createAppointment(BODY)).rejects.toMatchObject({ statusCode: 404 });
  });


  test('creates appointment with BOOKED status', async () => {
    const result = await svc.createAppointment(BODY);
    expect(repo.createWithTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ appointmentData: expect.objectContaining({ status: 'BOOKED' }) })
    );
    expect(result).toEqual(APPOINTMENT);
  });

  test('generates bookingNo in BKG-YYYYMMDD-XXXX format', async () => {
    await svc.createAppointment(BODY);
    const callArg = repo.createWithTransaction.mock.calls[0][0];
    expect(callArg.appointmentData.bookingNo).toMatch(/^BKG-\d{8}-\d{4}$/);
  });
});

// ── changeAppointmentStatus ────────────────────────────────────────────

describe('changeAppointmentStatus', () => {
  beforeEach(() => {
    repo.changeStatusWithTransaction.mockResolvedValue({ ...APPOINTMENT, status: 'CONFIRMED' });
  });

  test('throws 404 when appointment not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.changeAppointmentStatus('x', { status: 'CONFIRMED' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 422 when status is same as current', async () => {
    repo.findById.mockResolvedValue({ ...APPOINTMENT, status: 'BOOKED' });
    await expect(svc.changeAppointmentStatus('apt1', { status: 'BOOKED' }))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  test('throws 422 when transition is not allowed', async () => {
    // COMPLETED → CONFIRMED is not a valid transition
    repo.findById.mockResolvedValue({ ...APPOINTMENT, status: 'COMPLETED' });
    await expect(svc.changeAppointmentStatus('apt1', { status: 'CONFIRMED' }))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  test('throws 422 when cancelling without cancelReason', async () => {
    repo.findById.mockResolvedValue(APPOINTMENT);
    await expect(svc.changeAppointmentStatus('apt1', { status: 'CANCELLED' }))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  test('allows BOOKED → CONFIRMED', async () => {
    repo.findById.mockResolvedValue(APPOINTMENT);
    await expect(svc.changeAppointmentStatus('apt1', { status: 'CONFIRMED' })).resolves.toBeDefined();
    expect(repo.changeStatusWithTransaction).toHaveBeenCalled();
  });

  test('allows BOOKED → CANCELLED when cancelReason provided', async () => {
    repo.findById.mockResolvedValue(APPOINTMENT);
    await expect(
      svc.changeAppointmentStatus('apt1', { status: 'CANCELLED', cancelReason: 'Customer request' })
    ).resolves.toBeDefined();
  });
});
