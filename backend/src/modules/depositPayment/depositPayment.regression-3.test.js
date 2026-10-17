'use strict';

// Regression: QA operasional 2026-10-17 — R2b: INVENTORY bisa membaca pembayaran deposit lewat API.
// Found by /qa on 2026-10-17

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

test.each([['get', '/'], ['get', '/summary'], ['get', '/:id']])(
  '%s %s hanya untuk role menu Pembayaran Deposit (INVENTORY & STAFF_OPERASIONAL ditolak)',
  (method, path) => {
    expect(rolesFor(method, path)).toEqual(['SUPER_ADMIN', 'OWNER', 'MANAGER', 'CASHIER', 'OFFICE', 'FINANCE']);
  },
);
