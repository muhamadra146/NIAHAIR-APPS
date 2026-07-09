'use strict';

jest.mock('./shift.repository');

const repo = require('./shift.repository');
const svc  = require('./shift.service');

const SHIFT = {
  id: 'sh1', code: 'PAGI', name: 'Pagi',
  startTime: '08:00', endTime: '17:00', isWorking: true, isActive: true,
};

beforeEach(() => jest.clearAllMocks());

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns shifts with isUsed flag', async () => {
    repo.findAll.mockResolvedValue([SHIFT]);
    repo.findUsedShiftIds.mockResolvedValue(new Set(['sh1']));

    const result = await svc.getAll();
    expect(result[0].isUsed).toBe(true);
  });

  test('marks unused shifts with isUsed=false', async () => {
    repo.findAll.mockResolvedValue([SHIFT]);
    repo.findUsedShiftIds.mockResolvedValue(new Set()); // empty set

    const result = await svc.getAll();
    expect(result[0].isUsed).toBe(false);
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns shift with isUsed flag when found', async () => {
    repo.findById.mockResolvedValue(SHIFT);
    repo.isShiftUsed.mockResolvedValue(true);

    const result = await svc.getById('sh1');
    expect(result.id).toBe('sh1');
    expect(result.isUsed).toBe(true);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    repo.isShiftUsed.mockResolvedValue(false);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createShift ────────────────────────────────────────────────────────

describe('createShift', () => {
  test('throws 409 when code already exists', async () => {
    repo.findByCode.mockResolvedValue(SHIFT);
    await expect(svc.createShift({ code: 'PAGI', name: 'Pagi' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('creates shift with defaults and isUsed=false', async () => {
    repo.findByCode.mockResolvedValue(null);
    repo.create.mockResolvedValue(SHIFT);

    const result = await svc.createShift({ code: 'MALAM', name: 'Malam' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      code: 'MALAM', isWorking: true,
    }));
    expect(result.isUsed).toBe(false);
  });
});

// ── updateShift ────────────────────────────────────────────────────────

describe('updateShift', () => {
  test('throws 404 when shift not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.updateShift('x', {})).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 422 when changing locked field on used shift', async () => {
    repo.findById.mockResolvedValue(SHIFT);
    repo.isShiftUsed.mockResolvedValue(true);

    await expect(svc.updateShift('sh1', { startTime: '09:00' }))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  test('allows changing name/color on used shift', async () => {
    repo.findById.mockResolvedValue(SHIFT);
    repo.isShiftUsed.mockResolvedValue(true);
    repo.update.mockResolvedValue({ ...SHIFT, name: 'Pagi Baru' });

    const result = await svc.updateShift('sh1', { name: 'Pagi Baru' });
    expect(repo.update).toHaveBeenCalledWith('sh1', expect.objectContaining({ name: 'Pagi Baru' }));
    expect(result.isUsed).toBe(true);
  });

  test('throws 409 when new code conflicts on unused shift', async () => {
    repo.findById.mockResolvedValue(SHIFT);
    repo.isShiftUsed.mockResolvedValue(false);
    repo.findByCode.mockResolvedValue({ id: 'other' });

    await expect(svc.updateShift('sh1', { code: 'TAKEN' })).rejects.toMatchObject({ statusCode: 409 });
  });

  test('updates locked fields when shift is unused', async () => {
    repo.findById.mockResolvedValue(SHIFT);
    repo.isShiftUsed.mockResolvedValue(false);
    repo.findByCode.mockResolvedValue(null);
    repo.update.mockResolvedValue({ ...SHIFT, startTime: '09:00' });

    const result = await svc.updateShift('sh1', { startTime: '09:00' });
    expect(repo.update).toHaveBeenCalledWith('sh1', expect.objectContaining({ startTime: '09:00' }));
    expect(result.isUsed).toBe(false);
  });
});

// ── deleteShift ────────────────────────────────────────────────────────

describe('deleteShift', () => {
  test('throws 404 when shift not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.deleteShift('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('soft deletes when shift is used in schedules', async () => {
    repo.findById.mockResolvedValue(SHIFT);
    repo.isShiftUsed.mockResolvedValue(true);
    repo.softDelete.mockResolvedValue({ ...SHIFT, isActive: false });

    const result = await svc.deleteShift('sh1');
    expect(repo.softDelete).toHaveBeenCalledWith('sh1');
    expect(result.isUsed).toBe(true);
  });

  test('hard deletes when shift is unused', async () => {
    repo.findById.mockResolvedValue(SHIFT);
    repo.isShiftUsed.mockResolvedValue(false);
    repo.hardDelete.mockResolvedValue(undefined);

    const result = await svc.deleteShift('sh1');
    expect(repo.hardDelete).toHaveBeenCalledWith('sh1');
    expect(result).toEqual({ deleted: true });
  });
});
