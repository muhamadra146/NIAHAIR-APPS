'use strict';

jest.mock('./employee.repository');

const repo = require('./employee.repository');
const svc  = require('./employee.service');

const EMPLOYEE = {
  id:           'e1',
  name:         'Nia',
  employeeCode: 'EMP001',
  email:        'nia@salon.com',
  roleId:       'role1',
};

beforeEach(() => jest.clearAllMocks());

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([EMPLOYEE]);
    repo.count.mockResolvedValue(1);

    const result = await svc.getAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns employee when found', async () => {
    repo.findById.mockResolvedValue(EMPLOYEE);
    await expect(svc.getById('e1')).resolves.toEqual(EMPLOYEE);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createEmployee ─────────────────────────────────────────────────────

describe('createEmployee', () => {
  beforeEach(() => {
    repo.findRoleById.mockResolvedValue({ id: 'role1' });
    repo.findByEmployeeCode.mockResolvedValue(null);
    repo.findByEmail.mockResolvedValue(null);
    repo.findLastEmployeeCode.mockResolvedValue(null);
    repo.create.mockResolvedValue(EMPLOYEE);
  });

  test('throws 404 when role not found', async () => {
    repo.findRoleById.mockResolvedValue(null);
    await expect(svc.createEmployee({ roleId: 'bad' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 409 when employeeCode already exists', async () => {
    repo.findByEmployeeCode.mockResolvedValue(EMPLOYEE);
    await expect(svc.createEmployee({ roleId: 'role1', employeeCode: 'EMP001' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('throws 409 when email already exists', async () => {
    repo.findByEmail.mockResolvedValue(EMPLOYEE);
    await expect(svc.createEmployee({ roleId: 'role1', email: 'nia@salon.com' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('auto-generates employeeCode when not provided', async () => {
    repo.findLastEmployeeCode.mockResolvedValue(null);
    // findByEmployeeCode returns null → code EMP001 is available
    repo.findByEmployeeCode.mockResolvedValue(null);

    await svc.createEmployee({ roleId: 'role1' });
    const callArg = repo.create.mock.calls[0][0];
    expect(callArg.employeeCode).toMatch(/^EMP\d{3}$/);
  });

  test('converts hireDate string to Date', async () => {
    await svc.createEmployee({ roleId: 'role1', hireDate: '2023-01-01' });
    const callArg = repo.create.mock.calls[0][0];
    expect(callArg.hireDate).toBeInstanceOf(Date);
  });

  test('converts birthDate string to Date', async () => {
    await svc.createEmployee({ roleId: 'role1', birthDate: '1990-05-15' });
    const callArg = repo.create.mock.calls[0][0];
    expect(callArg.birthDate).toBeInstanceOf(Date);
  });
});

// ── updateEmployee ─────────────────────────────────────────────────────

describe('updateEmployee', () => {
  beforeEach(() => {
    repo.findById.mockResolvedValue(EMPLOYEE);
    repo.findRoleById.mockResolvedValue({ id: 'role2' });
    repo.findByEmployeeCode.mockResolvedValue(null);
    repo.findByEmail.mockResolvedValue(null);
    repo.update.mockResolvedValue(EMPLOYEE);
  });

  test('throws 404 when employee not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.updateEmployee('x', {})).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 404 when new roleId not found', async () => {
    repo.findRoleById.mockResolvedValue(null);
    await expect(svc.updateEmployee('e1', { roleId: 'badRole' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('skips role check when roleId unchanged', async () => {
    // roleId same as employee.roleId — no lookup
    await svc.updateEmployee('e1', { roleId: EMPLOYEE.roleId });
    expect(repo.findRoleById).not.toHaveBeenCalled();
  });

  test('throws 409 when new employeeCode already taken', async () => {
    repo.findByEmployeeCode.mockResolvedValue({ id: 'e99' });
    await expect(svc.updateEmployee('e1', { employeeCode: 'EMP999' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('skips code check when employeeCode unchanged', async () => {
    await svc.updateEmployee('e1', { employeeCode: EMPLOYEE.employeeCode });
    expect(repo.findByEmployeeCode).not.toHaveBeenCalled();
  });

  test('throws 409 when new email already taken', async () => {
    repo.findByEmail.mockResolvedValue({ id: 'e99' });
    await expect(svc.updateEmployee('e1', { email: 'new@salon.com' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('skips email check when email unchanged', async () => {
    await svc.updateEmployee('e1', { email: EMPLOYEE.email });
    expect(repo.findByEmail).not.toHaveBeenCalled();
  });

  test('converts hireDate string to Date on update', async () => {
    await svc.updateEmployee('e1', { hireDate: '2024-03-01' });
    const callArg = repo.update.mock.calls[0][1];
    expect(callArg.hireDate).toBeInstanceOf(Date);
  });
});

// ── deleteEmployee ─────────────────────────────────────────────────────

describe('deleteEmployee', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.deleteEmployee('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('calls softDelete on success', async () => {
    repo.findById.mockResolvedValue(EMPLOYEE);
    repo.softDelete.mockResolvedValue({ ...EMPLOYEE, isActive: false });

    const result = await svc.deleteEmployee('e1');
    expect(repo.softDelete).toHaveBeenCalledWith('e1');
    expect(result.isActive).toBe(false);
  });
});
