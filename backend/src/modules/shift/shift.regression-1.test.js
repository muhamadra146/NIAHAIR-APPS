'use strict';

// Regression: QA G3-22 (2026-10-15) — shift dengan startTime "99:99" diterima.

const { safeParse } = require('valibot');
const { createShiftSchema, updateShiftSchema } = require('./shift.validation');

const BASE = { code: 'PG', name: 'Pagi' };

test.each(['99:99', '24:00', '9:00', '08:60', 'jam8'])('jam "%s" ditolak', (t) => {
  expect(safeParse(createShiftSchema, { ...BASE, startTime: t }).success).toBe(false);
  expect(safeParse(updateShiftSchema, { endTime: t }).success).toBe(false);
});

test.each(['00:00', '08:30', '23:59', ''])('jam "%s" diterima (kosong = shift tanpa jam)', (t) => {
  expect(safeParse(createShiftSchema, { ...BASE, startTime: t, endTime: t }).success).toBe(true);
});

test('kode/nama spasi saja ditolak', () => {
  expect(safeParse(createShiftSchema, { code: '  ', name: 'Pagi' }).success).toBe(false);
});
