'use strict';

jest.mock('./leaveType.repository');

const repo = require('./leaveType.repository');
const svc  = require('./leaveType.service');

const LEAVE_TYPE = { id: 'lt1', code: 'SAKIT', name: 'Sakit', quotaType: 'ANNUAL', isActive: true };

beforeEach(() => jest.clearAllMocks());

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('passes isActive filter by default', async () => {
    repo.findAll.mockResolvedValue([LEAVE_TYPE]);
    await svc.getAll();
    expect(repo.findAll).toHaveBeenCalledWith({ isActive: true });
  });

  test('passes empty filter when includeInactive=true', async () => {
    repo.findAll.mockResolvedValue([LEAVE_TYPE]);
    await svc.getAll(true);
    expect(repo.findAll).toHaveBeenCalledWith({});
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns leave type when found', async () => {
    repo.findById.mockResolvedValue(LEAVE_TYPE);
    await expect(svc.getById('lt1')).resolves.toEqual(LEAVE_TYPE);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── create ─────────────────────────────────────────────────────────────

describe('create', () => {
  test('throws 409 when code already exists', async () => {
    repo.findByCode.mockResolvedValue(LEAVE_TYPE);
    await expect(svc.create({ code: 'SAKIT', name: 'Sakit' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('throws 400 when quotaType is invalid', async () => {
    repo.findByCode.mockResolvedValue(null);
    await expect(svc.create({ code: 'CUSTOM', name: 'Custom', quotaType: 'INVALID' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('creates leave type with uppercase code', async () => {
    repo.findByCode.mockResolvedValue(null);
    repo.create.mockResolvedValue(LEAVE_TYPE);

    await svc.create({ code: 'sakit', name: 'Sakit', quotaType: 'ANNUAL' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ code: 'SAKIT' }));
  });

  test('defaults quotaType to ANNUAL and maxDaysPerYear to 12', async () => {
    repo.findByCode.mockResolvedValue(null);
    repo.create.mockResolvedValue(LEAVE_TYPE);

    await svc.create({ code: 'TEST', name: 'Test' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      quotaType:      'ANNUAL',
      maxDaysPerYear: 12,
      isPaid:         true,
    }));
  });
});

// ── update ─────────────────────────────────────────────────────────────

describe('update', () => {
  test('throws 404 when leave type not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.update('x', { name: 'New' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 400 when new quotaType is invalid', async () => {
    repo.findById.mockResolvedValue(LEAVE_TYPE);
    await expect(svc.update('lt1', { quotaType: 'BAD' })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('updates allowed fields', async () => {
    repo.findById.mockResolvedValue(LEAVE_TYPE);
    repo.update.mockResolvedValue({ ...LEAVE_TYPE, name: 'Updated' });

    const result = await svc.update('lt1', { name: 'Updated', maxDaysPerYear: 15 });
    expect(repo.update).toHaveBeenCalledWith('lt1', expect.objectContaining({
      name:           'Updated',
      maxDaysPerYear: 15,
    }));
    expect(result.name).toBe('Updated');
  });
});
