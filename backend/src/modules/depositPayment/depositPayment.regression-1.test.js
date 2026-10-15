'use strict';

// Regression: G1-31 — Owner ditolak 403 saat mencatat pembayaran deposit.
// Keputusan owner: OWNER punya hak yang sama dengan MANAGER di sini.
// Found by /qa on 2026-10-15

jest.mock('../../middlewares/role.middleware', () => jest.fn((...roles) => {
  const mw = (req, res, next) => next();
  mw.roles = roles;
  return mw;
}));
jest.mock('../../middlewares/depositUpload.middleware', () => ({ single: () => (req, res, next) => next() }));
jest.mock('./depositPayment.controller', () => new Proxy({}, { get: () => (req, res) => res.end() }));

const router = require('./depositPayment.route');

const rolesFor = (method, path) => {
  const layer = router.stack.find((l) => l.route?.path === path && l.route.methods[method]);
  return layer.route.stack.map((s) => s.handle.roles).find(Boolean) ?? null;
};

test('POST / (catat pembayaran deposit) mengizinkan OWNER', () => {
  expect(rolesFor('post', '/')).toEqual(['SUPER_ADMIN', 'OWNER', 'MANAGER', 'CASHIER']);
});
