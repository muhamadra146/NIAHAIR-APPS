'use strict';

// Regression: QA operasional 2026-10-17 — R1/R2b: foto booking mengikuti hak akses booking
// (tulis = POS; OFFICE & STAFF_OPERASIONAL view-only; INVENTORY tidak bisa membaca).
// Found by /qa on 2026-10-17

jest.mock('../../middlewares/role.middleware', () => jest.fn((...roles) => {
  const mw = (req, res, next) => next();
  mw.roles = roles;
  return mw;
}));
jest.mock('../../middlewares/upload.middleware', () => ({ single: () => (req, res, next) => next() }));
jest.mock('./appointmentPhoto.controller', () => new Proxy({}, { get: () => (req, res) => res.end() }));

const router = require('./appointmentPhoto.route');

const rolesFor = (method, path) => {
  const layer = router.stack.find((l) => l.route?.path === path && l.route.methods[method]);
  return layer.route.stack.map((s) => s.handle.roles).find(Boolean) ?? null;
};

test.each([['post', '/'], ['delete', '/:photoId']])('%s %s hanya POS', (method, path) => {
  expect(rolesFor(method, path)).toEqual(['SUPER_ADMIN', 'OWNER', 'MANAGER', 'CASHIER']);
});

test('GET / menolak INVENTORY', () => {
  expect(rolesFor('get', '/')).not.toContain('INVENTORY');
  expect(rolesFor('get', '/')).toEqual(expect.arrayContaining(['STAFF_OPERASIONAL', 'OFFICE', 'FINANCE']));
});
