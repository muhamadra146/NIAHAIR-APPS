'use strict';

// Regression: ISSUE-004 — data master (cabang, karyawan, jabatan, item) bisa diubah semua user
// yang login lewat API, termasuk titik lokasi absen cabang.
// Found by /qa on 2026-10-15
// Report: .gstack/qa-reports/qa-report-localhost-2026-10-15.md

jest.mock('../../middlewares/role.middleware', () => jest.fn((...roles) => {
  const mw = (req, res, next) => next();
  mw.roles = roles;
  return mw;
}));
const anyController = () => new Proxy({}, { get: () => (req, res) => res.end() });
jest.mock('./employee.controller', () => anyController());
jest.mock('../branch/branch.controller', () => anyController());
jest.mock('../employeeRole/employeeRole.controller', () => anyController());
jest.mock('../item/item.controller', () => anyController());
jest.mock('../item/item.sync.controller', () => anyController());
jest.mock('../item/item.push.controller', () => anyController());

const rolesFor = (router, method, path) => {
  const layer = router.stack.find((l) => l.route?.path === path && l.route.methods[method]);
  if (!layer) throw new Error(`route ${method.toUpperCase()} ${path} tidak ada`);
  return layer.route.stack.map((s) => s.handle.roles).find(Boolean) ?? null;
};

const ADMIN = ['SUPER_ADMIN', 'OWNER'];
const EMPLOYEE_WRITE = ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'OFFICE'];

describe.each([
  ['employee/employee.route',         'post',   '/',          EMPLOYEE_WRITE],
  ['employee/employee.route',         'put',    '/:id',       EMPLOYEE_WRITE],
  ['employee/employee.route',         'patch',  '/:id/files', EMPLOYEE_WRITE],
  ['branch/branch.route',             'post',   '/',          ADMIN],
  ['branch/branch.route',             'put',    '/:id',       ADMIN],
  ['employeeRole/employeeRole.route', 'post',   '/',          ADMIN],
  ['employeeRole/employeeRole.route', 'put',    '/:id',       ADMIN],
  ['employeeRole/employeeRole.route', 'delete', '/:id',       ADMIN],
  ['item/item.route',                 'post',   '/',          ADMIN],
])('%s %s %s', (file, method, path, expected) => {
  test('dibatasi peran yang berwenang', () => {
    const router = require(`../${file}`);
    expect(rolesFor(router, method, path)).toEqual(expected);
  });
});
