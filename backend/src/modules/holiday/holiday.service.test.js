'use strict';

jest.mock('./holiday.repository');

const repo = require('./holiday.repository');
const svc  = require('./holiday.service');

const HOLIDAY = { id: 'h1', date: new Date('2024-01-01'), name: 'Tahun Baru', year: 2024 };

beforeEach(() => jest.clearAllMocks());

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('passes year filter to repo', async () => {
    repo.findAll.mockResolvedValue([HOLIDAY]);
    const result = await svc.getAll({ year: 2024 });
    expect(repo.findAll).toHaveBeenCalledWith({ year: 2024 });
    expect(result).toHaveLength(1);
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns holiday when found', async () => {
    repo.findById.mockResolvedValue(HOLIDAY);
    await expect(svc.getById('h1')).resolves.toEqual(HOLIDAY);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── create ─────────────────────────────────────────────────────────────

describe('create', () => {
  test('throws 409 when holiday already exists on that date', async () => {
    repo.findByDate.mockResolvedValue(HOLIDAY);
    await expect(svc.create({ date: '2024-01-01', name: 'Tahun Baru' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('creates holiday with normalized UTC date and auto year', async () => {
    repo.findByDate.mockResolvedValue(null);
    repo.create.mockResolvedValue(HOLIDAY);

    const result = await svc.create({ date: '2024-12-25', name: 'Natal' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Natal',
      year: 2024,
      date: expect.any(Date),
    }));
    expect(result).toEqual(HOLIDAY);
  });
});

// ── update ─────────────────────────────────────────────────────────────

describe('update', () => {
  test('throws 404 when holiday not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.update('x', { name: 'Test' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 409 when updating to a date that already has a holiday (different id)', async () => {
    repo.findById.mockResolvedValue(HOLIDAY);
    repo.findByDate.mockResolvedValue({ id: 'h_other', name: 'Other' });

    await expect(svc.update('h1', { date: '2024-06-01' })).rejects.toMatchObject({ statusCode: 409 });
  });

  test('allows updating date to same holiday date (same id)', async () => {
    repo.findById.mockResolvedValue(HOLIDAY);
    repo.findByDate.mockResolvedValue({ ...HOLIDAY }); // same id = OK
    repo.update.mockResolvedValue(HOLIDAY);

    await svc.update('h1', { date: '2024-01-01', name: 'Tahun Baru Baru' });
    expect(repo.update).toHaveBeenCalled();
  });

  test('updates name only without touching date', async () => {
    repo.findById.mockResolvedValue(HOLIDAY);
    repo.update.mockResolvedValue({ ...HOLIDAY, name: 'Updated Name' });

    const result = await svc.update('h1', { name: 'Updated Name' });
    expect(repo.findByDate).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledWith('h1', { name: 'Updated Name' });
    expect(result.name).toBe('Updated Name');
  });
});

// ── remove ─────────────────────────────────────────────────────────────

describe('remove', () => {
  test('throws 404 when holiday not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.remove('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('removes holiday and returns deleted flag', async () => {
    repo.findById.mockResolvedValue(HOLIDAY);
    repo.remove.mockResolvedValue(undefined);

    const result = await svc.remove('h1');
    expect(repo.remove).toHaveBeenCalledWith('h1');
    expect(result).toEqual({ deleted: true });
  });
});
