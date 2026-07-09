'use strict';

jest.mock('./treatment.repository');

const repo = require('./treatment.repository');
const svc  = require('./treatment.service');

const SESSION = {
  id: 'ts1', customerId: 'c1', branchId: 'b1',
  appointmentId: null, notes: null, completedAt: null,
};

beforeEach(() => jest.clearAllMocks());

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([SESSION]);
    repo.count.mockResolvedValue(1);

    const result = await svc.getAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns session when found', async () => {
    repo.findById.mockResolvedValue(SESSION);
    await expect(svc.getById('ts1')).resolves.toEqual(SESSION);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createSession ──────────────────────────────────────────────────────

describe('createSession', () => {
  beforeEach(() => {
    repo.findCustomerById.mockResolvedValue({ id: 'c1' });
    repo.findBranchById.mockResolvedValue({ id: 'b1' });
    repo.findAppointmentById.mockResolvedValue({ id: 'a1' });
    repo.create.mockResolvedValue(SESSION);
  });

  test('throws 404 when customer not found', async () => {
    repo.findCustomerById.mockResolvedValue(null);
    await expect(svc.createSession({ customerId: 'bad', branchId: 'b1' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 404 when branch not found', async () => {
    repo.findBranchById.mockResolvedValue(null);
    await expect(svc.createSession({ customerId: 'c1', branchId: 'bad' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 404 when appointmentId provided but not found', async () => {
    repo.findAppointmentById.mockResolvedValue(null);
    await expect(svc.createSession({ customerId: 'c1', branchId: 'b1', appointmentId: 'bad' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('creates session without appointmentId', async () => {
    const result = await svc.createSession({ customerId: 'c1', branchId: 'b1' });
    expect(repo.create).toHaveBeenCalledWith(expect.not.objectContaining({ appointmentId: expect.anything() }));
    expect(result).toEqual(SESSION);
  });

  test('creates session with appointmentId when provided', async () => {
    await svc.createSession({ customerId: 'c1', branchId: 'b1', appointmentId: 'a1' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ appointmentId: 'a1' }));
  });

  test('converts startedAt string to Date', async () => {
    await svc.createSession({ customerId: 'c1', branchId: 'b1', startedAt: '2024-06-01T09:00:00Z' });
    const callArg = repo.create.mock.calls[0][0];
    expect(callArg.startedAt).toBeInstanceOf(Date);
  });
});

// ── updateSession ──────────────────────────────────────────────────────

describe('updateSession', () => {
  test('throws 404 when session not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.updateSession('x', { notes: 'test' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('updates notes', async () => {
    repo.findById.mockResolvedValue(SESSION);
    repo.update.mockResolvedValue({ ...SESSION, notes: 'Updated notes' });

    const result = await svc.updateSession('ts1', { notes: 'Updated notes' });
    expect(repo.update).toHaveBeenCalledWith('ts1', expect.objectContaining({ notes: 'Updated notes' }));
    expect(result.notes).toBe('Updated notes');
  });

  test('converts completedAt string to Date', async () => {
    repo.findById.mockResolvedValue(SESSION);
    repo.update.mockResolvedValue({ ...SESSION, completedAt: new Date() });

    await svc.updateSession('ts1', { completedAt: '2024-06-01T18:00:00Z' });
    const callArg = repo.update.mock.calls[0][1];
    expect(callArg.completedAt).toBeInstanceOf(Date);
  });

  test('sets completedAt to null when falsy value passed', async () => {
    repo.findById.mockResolvedValue(SESSION);
    repo.update.mockResolvedValue(SESSION);

    await svc.updateSession('ts1', { completedAt: null });
    expect(repo.update).toHaveBeenCalledWith('ts1', expect.objectContaining({ completedAt: null }));
  });
});
