'use strict';

jest.mock('./employeeRole.repository');

const repo = require('./employeeRole.repository');
const svc  = require('./employeeRole.service');

const EROLE = { id: 'er1', code: 'STYLIST', name: 'Stylist', isActive: true };

beforeEach(() => jest.clearAllMocks());

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([EROLE]);
    repo.count.mockResolvedValue(1);

    const result = await svc.getAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns role when found', async () => {
    repo.findById.mockResolvedValue(EROLE);
    await expect(svc.getById('er1')).resolves.toEqual(EROLE);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createEmployeeRole ─────────────────────────────────────────────────

describe('createEmployeeRole', () => {
  test('throws 409 when code already exists', async () => {
    repo.findByCode.mockResolvedValue(EROLE);
    await expect(svc.createEmployeeRole({ code: 'STYLIST', name: 'Stylist' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('creates role when code is unique', async () => {
    repo.findByCode.mockResolvedValue(null);
    repo.create.mockResolvedValue(EROLE);

    const result = await svc.createEmployeeRole({ code: 'STYLIST', name: 'Stylist' });
    expect(repo.create).toHaveBeenCalled();
    expect(result).toEqual(EROLE);
  });
});

// ── updateEmployeeRole ─────────────────────────────────────────────────

describe('updateEmployeeRole', () => {
  beforeEach(() => {
    repo.findById.mockResolvedValue(EROLE);
    repo.findByCode.mockResolvedValue(null);
    repo.update.mockResolvedValue({ ...EROLE, name: 'Updated' });
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.updateEmployeeRole('x', {})).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 409 when new code already taken', async () => {
    repo.findByCode.mockResolvedValue({ id: 'er_other' });
    await expect(svc.updateEmployeeRole('er1', { code: 'TAKEN' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('skips code check when code unchanged', async () => {
    await svc.updateEmployeeRole('er1', { code: EROLE.code, name: 'Updated' });
    expect(repo.findByCode).not.toHaveBeenCalled();
  });

  test('updates role successfully', async () => {
    const result = await svc.updateEmployeeRole('er1', { name: 'Updated' });
    expect(repo.update).toHaveBeenCalledWith('er1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });
});

// ── deleteEmployeeRole ─────────────────────────────────────────────────

describe('deleteEmployeeRole', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.deleteEmployeeRole('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 409 when employees still use this role', async () => {
    repo.findById.mockResolvedValue(EROLE);
    repo.countEmployees.mockResolvedValue(2);
    await expect(svc.deleteEmployeeRole('er1')).rejects.toMatchObject({ statusCode: 409 });
  });

  test('removes role when no employees use it', async () => {
    repo.findById.mockResolvedValue(EROLE);
    repo.countEmployees.mockResolvedValue(0);
    repo.remove.mockResolvedValue(EROLE);

    const result = await svc.deleteEmployeeRole('er1');
    expect(repo.remove).toHaveBeenCalledWith('er1');
    expect(result).toEqual(EROLE);
  });
});
