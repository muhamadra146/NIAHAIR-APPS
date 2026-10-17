'use strict';

// Regression G5-09 — PATCH /gl-accounts/:id/usage tanpa body → 500 (API QA 2026-10-15)
const validate = require('../../middlewares/validate.middleware');
const { updateUsageSchema } = require('./glAccount.validation');

const run = (body) => {
  const next = jest.fn();
  validate(updateUsageSchema)({ body }, {}, next);
  return next.mock.calls[0][0];
};

test.each([[undefined], [{}]])('tanpa body / tanpa usage (%j) → 422, tag tidak terhapus diam-diam', (body) => {
  expect(run(body)).toMatchObject({ statusCode: 422 });
});

test('usage bukan teks → 422', () => {
  expect(run({ usage: 123 })).toMatchObject({ statusCode: 422 });
});

test.each([[{ usage: 'CASH_ACCOUNT' }], [{ usage: null }]])('%j lolos', (body) => {
  expect(run(body)).toBeUndefined();
});
