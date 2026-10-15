// Regression: G4-24b — POST /inventory/service-movement/:id tanpa pembatasan peran
// Found by /qa on 2026-10-15
'use strict';

// authorize() diganti penanda agar peran yang dipasang di route bisa diperiksa
jest.mock('../../middlewares/role.middleware', () => (...roles) => {
  const mw = (_req, _res, next) => next();
  mw.roles = roles;
  return mw;
});
jest.mock('../../middlewares/auth.middleware', () => (_req, _res, next) => next());
jest.mock('./inventory.controller', () => new Proxy({}, { get: () => (_req, _res, next) => next() }));

const router = require('./inventory.route');

test('service-movement memakai authorize dengan peran treatment, tanpa STAFF_OPERASIONAL/OFFICE', () => {
  const layer = router.stack.find((l) => l.route?.path === '/service-movement/:treatmentSessionId');
  const guard = layer.route.stack.map((s) => s.handle).find((h) => h.roles);
  expect(guard).toBeDefined();
  expect(guard.roles).toEqual(expect.arrayContaining(['SUPER_ADMIN', 'OWNER', 'MANAGER', 'CASHIER', 'INVENTORY']));
  expect(guard.roles).not.toContain('OFFICE');
  expect(guard.roles).not.toContain('FINANCE');
});
