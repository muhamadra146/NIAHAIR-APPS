// Regression: G4-11 — POST /items/:id/sync/accurate tanpa cek peran (kasir bisa push item ke Accurate)
// Found by /qa on 2026-10-15
'use strict';

jest.mock('../../middlewares/role.middleware', () => (...roles) => {
  const mw = (_req, _res, next) => next();
  mw.roles = roles;
  return mw;
});
jest.mock('../../middlewares/auth.middleware', () => (_req, _res, next) => next());
jest.mock('../../middlewares/validate.middleware', () => () => (_req, _res, next) => next());
const stub = () => new Proxy({}, { get: () => (_req, _res, next) => next() });
jest.mock('./item.controller', () => stub());
jest.mock('./item.sync.controller', () => stub());
jest.mock('./item.push.controller', () => stub());

const router = require('./item.route');

test('push item ke Accurate hanya untuk SUPER_ADMIN, OWNER, MANAGER, INVENTORY', () => {
  const layer = router.stack.find((l) => l.route?.path === '/:id/sync/accurate' && l.route.methods.post);
  const guard = layer.route.stack.map((s) => s.handle).find((h) => h.roles);
  expect(guard).toBeDefined();
  expect([...guard.roles].sort()).toEqual(['INVENTORY', 'MANAGER', 'OWNER', 'SUPER_ADMIN']);
});
