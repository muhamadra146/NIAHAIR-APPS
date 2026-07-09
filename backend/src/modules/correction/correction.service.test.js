'use strict';

jest.mock('./correction.repository');

const repo = require('./correction.repository');
const svc  = require('./correction.service');

const CORRECTION = {
  id: 'cr1', status: 'PENDING',
  employeeId: 'e1', branchId: 'b1',
  staffScheduleId: 'ss1', reason: 'Lupa absen',
  requestedCheckIn: new Date('2024-06-01T08:00:00Z'),
  requestedCheckOut: null,
};

beforeEach(() => jest.clearAllMocks());

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([CORRECTION]);
    repo.count.mockResolvedValue(1);

    const result = await svc.getAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getMy ──────────────────────────────────────────────────────────────

describe('getMy', () => {
  test('returns corrections filtered by employeeId', async () => {
    repo.findAll.mockResolvedValue([CORRECTION]);
    repo.count.mockResolvedValue(1);

    const result = await svc.getMy({ employeeId: 'e1', page: 1, limit: 10 });
    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ employeeId: 'e1' }) })
    );
    expect(result.data).toHaveLength(1);
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns correction when found', async () => {
    repo.findById.mockResolvedValue(CORRECTION);
    await expect(svc.getById('cr1')).resolves.toEqual(CORRECTION);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── create ─────────────────────────────────────────────────────────────

describe('create', () => {
  const VALID_BODY = {
    staffScheduleId:  'ss1',
    reason:           'Lupa absen',
    requestedCheckIn: '2024-06-01T08:00:00Z',
  };

  test('throws 400 when employeeId is missing', async () => {
    await expect(svc.create(null, 'b1', VALID_BODY)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('throws 400 when branchId is missing', async () => {
    await expect(svc.create('e1', null, { ...VALID_BODY, branchId: undefined }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('throws 400 when staffScheduleId is missing', async () => {
    await expect(svc.create('e1', 'b1', { ...VALID_BODY, staffScheduleId: undefined }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('throws 400 when reason is missing', async () => {
    await expect(svc.create('e1', 'b1', { ...VALID_BODY, reason: undefined }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('throws 400 when both requestedCheckIn and requestedCheckOut are missing', async () => {
    await expect(svc.create('e1', 'b1', {
      staffScheduleId: 'ss1', reason: 'Lupa absen',
    })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('creates correction with PENDING status and converts checkIn to Date', async () => {
    repo.create.mockResolvedValue(CORRECTION);

    const result = await svc.create('e1', 'b1', VALID_BODY);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      status:           'PENDING',
      employeeId:       'e1',
      branchId:         'b1',
      requestedCheckIn: expect.any(Date),
    }));
    expect(result).toEqual(CORRECTION);
  });

  test('accepts requestedCheckOut only (no checkIn)', async () => {
    repo.create.mockResolvedValue(CORRECTION);

    await svc.create('e1', 'b1', {
      staffScheduleId:   'ss1',
      reason:            'Lupa checkout',
      requestedCheckOut: '2024-06-01T17:00:00Z',
    });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      requestedCheckOut: expect.any(Date),
    }));
  });
});

// ── review ─────────────────────────────────────────────────────────────

describe('review', () => {
  test('throws 404 when correction not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.review('x', 'mgr1', { status: 'APPROVED' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 400 when status is not PENDING', async () => {
    repo.findById.mockResolvedValue({ ...CORRECTION, status: 'APPROVED' });
    await expect(svc.review('cr1', 'mgr1', { status: 'REJECTED' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('throws 400 when review status is invalid', async () => {
    repo.findById.mockResolvedValue(CORRECTION);
    await expect(svc.review('cr1', 'mgr1', { status: 'CANCELLED' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('approves PENDING correction', async () => {
    repo.findById.mockResolvedValue(CORRECTION);
    repo.update.mockResolvedValue({ ...CORRECTION, status: 'APPROVED', reviewedBy: 'mgr1' });

    const result = await svc.review('cr1', 'mgr1', { status: 'APPROVED', reviewNote: 'OK' });
    expect(repo.update).toHaveBeenCalledWith('cr1', expect.objectContaining({
      status:     'APPROVED',
      reviewedBy: 'mgr1',
      reviewedAt: expect.any(Date),
    }));
    expect(result.status).toBe('APPROVED');
  });

  test('rejects PENDING correction', async () => {
    repo.findById.mockResolvedValue(CORRECTION);
    repo.update.mockResolvedValue({ ...CORRECTION, status: 'REJECTED' });

    await svc.review('cr1', 'mgr1', { status: 'REJECTED', reviewNote: 'Not valid' });
    expect(repo.update).toHaveBeenCalledWith('cr1', expect.objectContaining({ status: 'REJECTED' }));
  });
});
