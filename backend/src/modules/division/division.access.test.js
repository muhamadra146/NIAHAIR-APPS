'use strict';

// Aturan akses divisi (keputusan user 2026-10-14)

jest.mock('./division.repository');

const repo   = require('./division.repository');
const access = require('./division.access');

const EMP = {
  managerOpsA:   { id: 'm1', divisionId: 'ops', homeBranchId: 'A', isDivisionManager: true,  isActive: true },
  managerOpsA2:  { id: 'm2', divisionId: 'ops', homeBranchId: 'A', isDivisionManager: true,  isActive: true },
  managerOpsB:   { id: 'm3', divisionId: 'ops', homeBranchId: 'B', isDivisionManager: true,  isActive: true },
  managerFinA:   { id: 'm4', divisionId: 'fin', homeBranchId: 'A', isDivisionManager: true,  isActive: true },
  staffOpsA:     { id: 's1', divisionId: 'ops', homeBranchId: 'A', isDivisionManager: false, isActive: true },
  staffOpsB:     { id: 's2', divisionId: 'ops', homeBranchId: 'B', isDivisionManager: false, isActive: true },
  staffFinA:     { id: 's3', divisionId: 'fin', homeBranchId: 'A', isDivisionManager: false, isActive: true },
  staffNoDiv:    { id: 's4', divisionId: null,  homeBranchId: 'A', isDivisionManager: false, isActive: true },
};
const byId = Object.fromEntries(Object.values(EMP).map((e) => [e.id, e]));
repo.findEmployeeScope.mockImplementation(async (id) => byId[id] ?? null);

const user = (emp, roleCode = 'MANAGER') => ({ id: `u-${emp.id}`, roleCode, employeeId: emp.id });
const OWNER = { id: 'u-owner', roleCode: 'OWNER', employeeId: null };

describe('assertCanManage (persetujuan & ubah jadwal)', () => {
  test('manager mengurus staf satu divisi & satu cabang', async () => {
    await expect(access.assertCanManage(user(EMP.managerOpsA), 's1')).resolves.toBeUndefined();
  });

  test('manager tidak bisa mengurus staf cabang lain', async () => {
    await expect(access.assertCanManage(user(EMP.managerOpsA), 's2')).rejects.toMatchObject({ statusCode: 403 });
  });

  test('manager tidak bisa mengurus staf divisi lain', async () => {
    await expect(access.assertCanManage(user(EMP.managerOpsA), 's3')).rejects.toMatchObject({ statusCode: 403 });
  });

  test('manager tidak bisa menyetujui pengajuannya sendiri', async () => {
    await expect(access.assertCanManage(user(EMP.managerOpsA), 'm1')).rejects.toMatchObject({ statusCode: 403 });
  });

  test('sesama manager di divisi & cabang yang sama tidak saling menyetujui', async () => {
    await expect(access.assertCanManage(user(EMP.managerOpsA), 'm2')).rejects.toMatchObject({ statusCode: 403 });
  });

  test('role FINANCE yang menjadi manager divisi Finance mengurus stafnya', async () => {
    await expect(access.assertCanManage(user(EMP.managerFinA, 'FINANCE'), 's3')).resolves.toBeUndefined();
  });

  test('role MANAGER yang bukan manager divisi tidak punya wewenang', async () => {
    await expect(access.assertCanManage(user(EMP.staffOpsA, 'MANAGER'), 's1')).rejects.toMatchObject({ statusCode: 403 });
  });

  test('karyawan tanpa divisi hanya diurus Owner / Super Admin', async () => {
    await expect(access.assertCanManage(user(EMP.managerOpsA), 's4')).rejects.toMatchObject({ statusCode: 403 });
    await expect(access.assertCanManage(OWNER, 's4')).resolves.toBeUndefined();
  });

  test('Owner mengurus manager (pengajuan manager)', async () => {
    await expect(access.assertCanManage(OWNER, 'm1')).resolves.toBeUndefined();
  });
});

describe('visibleEmployeeWhere (melihat jadwal)', () => {
  test('staf melihat rekan satu divisi di cabangnya', async () => {
    expect(await access.visibleEmployeeWhere(user(EMP.staffOpsB, 'STAFF_OPERASIONAL'))).toEqual({ divisionId: 'ops', homeBranchId: 'B' });
  });

  test('karyawan tanpa divisi hanya melihat dirinya', async () => {
    expect(await access.visibleEmployeeWhere(user(EMP.staffNoDiv, 'CASHIER'))).toEqual({ id: 's4' });
  });

  test('Owner melihat semua', async () => {
    expect(await access.visibleEmployeeWhere(OWNER)).toEqual({});
  });
});

describe('managedEmployeeWhere (daftar pengajuan)', () => {
  test('manager: divisi + cabang, tanpa dirinya & sesama manager', async () => {
    const scope = await access.getScope(user(EMP.managerOpsA));
    expect(access.managedEmployeeWhere(scope)).toEqual({
      divisionId: 'ops', homeBranchId: 'A', isDivisionManager: false, id: { not: 'm1' },
    });
  });

  test('bukan approver → tidak ada data', async () => {
    const scope = await access.getScope(user(EMP.staffOpsA, 'STAFF_OPERASIONAL'));
    expect(access.isApprover(scope)).toBe(false);
    expect(access.managedEmployeeWhere(scope)).toEqual({ id: '__tidak_ada__' });
  });
});
