'use strict';

// Regression: QA G3-23 (2026-10-15) — kode/nama divisi berisi spasi saja diterima.

const { safeParse } = require('valibot');
const { createDivisionSchema, updateDivisionSchema } = require('./division.validation');

test('kode / nama spasi saja ditolak', () => {
  expect(safeParse(createDivisionSchema, { code: '   ', name: 'Ops' }).success).toBe(false);
  expect(safeParse(createDivisionSchema, { code: 'OPS', name: '  ' }).success).toBe(false);
  expect(safeParse(updateDivisionSchema, { name: ' ' }).success).toBe(false);
});

test('spasi di tepi dibuang', () => {
  const r = safeParse(createDivisionSchema, { code: ' ops ', name: ' Operasional ' });
  expect(r.output).toEqual({ code: 'ops', name: 'Operasional' });
});
