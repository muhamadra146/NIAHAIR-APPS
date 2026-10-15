'use strict';

// Regression: ISSUE-003 — ubah/batal/pasang DP/setup-treatment invoice tidak dibatasi peran;
// akun Gudang, Staf Operasional, dan Office bisa mengubah atau membatalkan invoice lewat API.
// Found by /qa on 2026-10-15
// Report: .gstack/qa-reports/qa-report-localhost-2026-10-15.md

// Catat peran yang diberikan ke authorize() pada tiap middleware
jest.mock('../../middlewares/role.middleware', () => jest.fn((...roles) => {
  const mw = (req, res, next) => next();
  mw.roles = roles;
  return mw;
}));
jest.mock('./invoice.controller', () => new Proxy({}, { get: () => (req, res) => res.end() }));

const router = require('./invoice.route');

const rolesFor = (method, path) => {
  const layer = router.stack.find((l) => l.route?.path === path && l.route.methods[method]);
  if (!layer) throw new Error(`route ${method.toUpperCase()} ${path} tidak ada`);
  return layer.route.stack.map((s) => s.handle.roles).find(Boolean) ?? null;
};

const POS_ROLES = ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'CASHIER'];

describe.each([
  ['patch', '/:id'],
  ['patch', '/:id/cancel'],
  ['post',  '/:invoiceId/deposits'],
  ['post',  '/:id/setup-treatment'],
])('%s %s', (method, path) => {
  test('hanya peran POS (SA, Owner, Manager, Kasir)', () => {
    expect(rolesFor(method, path)).toEqual(POS_ROLES);
  });

  test('Gudang, Staf Operasional, Office, Finance ditolak', () => {
    const roles = rolesFor(method, path);
    for (const r of ['INVENTORY', 'STAFF_OPERASIONAL', 'OFFICE', 'FINANCE']) expect(roles).not.toContain(r);
  });
});
