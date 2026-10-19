'use strict';

// Regression: keputusan user 2026-10-19 (EMP-005) — akses cabang karyawan ("Bisa Bekerja Di")
// boleh diubah Super Admin dan Owner (sebelumnya hanya Super Admin).

jest.mock('../../middlewares/role.middleware', () => jest.fn((...roles) => {
  const mw = (req, res, next) => next();
  mw.roles = roles;
  return mw;
}));
jest.mock('../../middlewares/uploadEmployee.middleware', () => ({ fields: () => (req, res, next) => next() }));
jest.mock('./employee.controller', () => new Proxy({}, { get: () => (req, res) => res.end() }));
jest.mock('./employee.repository');
jest.mock('../../config/cloudinary', () => ({ uploader: { destroy: jest.fn() } }));
jest.mock('../division/division.repository', () => ({ findById: jest.fn() }));

const router = require('./employee.route');
const repo = require('./employee.repository');
const svc = require('./employee.service');

beforeEach(() => jest.clearAllMocks());

describe('PATCH branches: Home Branch tetap termasuk akses cabang (EMP-005)', () => {
  test('home tidak dikirim → disinkron kembali sebagai cabang Utama', async () => {
    repo.findById.mockResolvedValue({ id: 'e1', homeBranchId: 'b1' });
    repo.updateBranches.mockResolvedValue({ id: 'e1' });
    repo.syncPrimaryBranch.mockResolvedValue({ id: 'e1', employeeBranches: [{ branchId: 'b1' }, { branchId: 'b2' }] });
    const r = await svc.updateEmployeeBranches('e1', ['b2']);
    expect(repo.updateBranches).toHaveBeenCalledWith('e1', ['b2']);
    expect(repo.syncPrimaryBranch).toHaveBeenCalledWith('e1', 'b1');
    expect(r.employeeBranches).toHaveLength(2);
  });

  test('home sudah dikirim / tanpa home → tidak perlu sinkron', async () => {
    repo.updateBranches.mockResolvedValue({ id: 'e1' });
    repo.findById.mockResolvedValue({ id: 'e1', homeBranchId: 'b1' });
    await svc.updateEmployeeBranches('e1', ['b1', 'b2']);
    repo.findById.mockResolvedValue({ id: 'e1', homeBranchId: null });
    await svc.updateEmployeeBranches('e1', ['b2']);
    expect(repo.syncPrimaryBranch).not.toHaveBeenCalled();
  });
});

const rolesFor = (method, path) => {
  const layer = router.stack.find((l) => l.route?.path === path && l.route.methods[method]);
  return layer.route.stack.map((s) => s.handle.roles).find(Boolean) ?? null;
};

test('PATCH /:id/branches → hanya SUPER_ADMIN dan OWNER', () => {
  expect(rolesFor('patch', '/:id/branches')).toEqual(['SUPER_ADMIN', 'OWNER']);
});
