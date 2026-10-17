'use strict';

// Regression: QA G3-26 (2026-10-15) — hari libur: OWNER tidak bisa mengelola (keputusan owner:
// SUPER_ADMIN, OWNER, MANAGER), nama kosong diterima.

jest.mock('../../middlewares/role.middleware', () => jest.fn((...roles) => {
  const mw = (req, res, next) => next();
  mw.roles = roles;
  return mw;
}));
jest.mock('./holiday.controller', () => new Proxy({}, { get: () => (req, res) => res.end() }));

const { safeParse } = require('valibot');
const router = require('./holiday.route');
const { createHolidaySchema, updateHolidaySchema } = require('./holiday.validation');

const rolesFor = (method, path) => {
  const layer = router.stack.find((l) => l.route?.path === path && l.route.methods[method]);
  return layer.route.stack.map((s) => s.handle.roles).find(Boolean) ?? null;
};

test.each([['post', '/'], ['put', '/:id'], ['delete', '/:id']])('%s %s: SA, OWNER, MANAGER', (method, path) => {
  expect(rolesFor(method, path)).toEqual(['SUPER_ADMIN', 'OWNER', 'MANAGER']);
});

test('nama kosong / spasi ditolak', () => {
  expect(safeParse(createHolidaySchema, { date: '2026-12-25', name: '  ' }).success).toBe(false);
  expect(safeParse(updateHolidaySchema, { name: '' }).success).toBe(false);
});

test('tanggal rusak ditolak', () => {
  expect(safeParse(createHolidaySchema, { date: 'bukan', name: 'Natal' }).success).toBe(false);
  expect(safeParse(createHolidaySchema, { date: '2026-12-25', name: 'Natal' }).success).toBe(true);
});
