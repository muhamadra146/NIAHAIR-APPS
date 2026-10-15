'use strict';

// Regression: G1-11 — endpoint tulis tanpa cek peran: item & assignment treatment, material-usages/bulk,
// foto booking, dan POST /customers/:id/sync/accurate (akun Gudang bisa push pelanggan ke Accurate).
// Found by /qa on 2026-10-15

jest.mock('../../middlewares/role.middleware', () => jest.fn((...roles) => {
  const mw = (req, res, next) => next();
  mw.roles = roles;
  return mw;
}));
jest.mock('../../middlewares/upload.middleware', () => ({ single: () => (req, res, next) => next() }));
const stubController = () => new Proxy({}, { get: () => (req, res) => res.end() });
jest.mock('./treatmentItem.controller', () => stubController());
jest.mock('../treatmentAssignment/treatmentAssignment.controller', () => stubController());
jest.mock('../materialUsage/materialUsage.controller', () => stubController());
jest.mock('../appointmentPhoto/appointmentPhoto.controller', () => stubController());
jest.mock('../customer/customer.controller', () => stubController());
jest.mock('../customer/customerNote.controller', () => stubController());
jest.mock('../customer/customer.sync.controller', () => stubController());
jest.mock('../customer/customer.push.controller', () => stubController());

const rolesFor = (router, method, path) => {
  const layer = router.stack.find((l) => l.route?.path === path && l.route.methods[method]);
  if (!layer) throw new Error(`route ${method.toUpperCase()} ${path} tidak ada`);
  return layer.route.stack.map((s) => s.handle.roles).find(Boolean) ?? null;
};

const routers = {
  item:       require('./treatmentItem.route'),
  assignment: require('../treatmentAssignment/treatmentAssignment.route'),
  material:   require('../materialUsage/materialUsage.route'),
  photo:      require('../appointmentPhoto/appointmentPhoto.route'),
  customer:   require('../customer/customer.route'),
};

test.each([
  ['item',       'post',   '/'],
  ['item',       'put',    '/:id'],
  ['item',       'delete', '/:id'],
  ['assignment', 'post',   '/'],
  ['assignment', 'put',    '/:id'],
  ['assignment', 'delete', '/:id'],
  ['material',   'post',   '/bulk'],
  ['photo',      'post',   '/'],
  ['photo',      'delete', '/:photoId'],
  ['customer',   'post',   '/:id/sync/accurate'],
])('%s %s %s dibatasi peran (Finance ditolak)', (name, method, path) => {
  const roles = rolesFor(routers[name], method, path);
  expect(roles).not.toBeNull();
  expect(roles).not.toContain('FINANCE');
});

test('push pelanggan ke Accurate hanya SA/Owner/Manager (Gudang & Kasir ditolak)', () => {
  expect(rolesFor(routers.customer, 'post', '/:id/sync/accurate')).toEqual(['SUPER_ADMIN', 'OWNER', 'MANAGER']);
});

test.each([['item', 'post', '/'], ['assignment', 'post', '/'], ['photo', 'post', '/']])(
  '%s %s %s menolak Gudang', (name, method, path) => {
    expect(rolesFor(routers[name], method, path)).not.toContain('INVENTORY');
  },
);
