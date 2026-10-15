'use strict';

// Regression: G1-31 — Owner ditolak 403 saat refund, batal deposit, dan link-appointment.
// Keputusan owner: OWNER punya hak yang sama dengan MANAGER di sini.
// Found by /qa on 2026-10-15

jest.mock('../../middlewares/role.middleware', () => jest.fn((...roles) => {
  const mw = (req, res, next) => next();
  mw.roles = roles;
  return mw;
}));
jest.mock('./deposit.controller', () => new Proxy({}, { get: () => (req, res) => res.end() }));

const router = require('./deposit.route');

const rolesFor = (method, path) => {
  const layer = router.stack.find((l) => l.route?.path === path && l.route.methods[method]);
  return layer.route.stack.map((s) => s.handle.roles).find(Boolean) ?? null;
};

test.each([
  ['patch', '/:id/link-appointment'],
  ['patch', '/:id/refund'],
  ['patch', '/:id/cancel'],
])('%s %s mengizinkan OWNER (setara MANAGER)', (method, path) => {
  const roles = rolesFor(method, path);
  expect(roles).toContain('OWNER');
  expect(roles).toContain('MANAGER');
});
