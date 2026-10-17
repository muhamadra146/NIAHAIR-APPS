'use strict';

// Regression: QA G3-21 (2026-10-15) — jenis cuti: maxDaysPerYear pecahan/negatif, nama "" saat PATCH,
// isActive hilang dari skema update.

const { safeParse } = require('valibot');
const { createLeaveTypeSchema, updateLeaveTypeSchema } = require('./leaveType.validation');

const ok = (schema, body) => safeParse(schema, body).success;

test('maxDaysPerYear harus bilangan bulat tidak negatif', () => {
  expect(ok(createLeaveTypeSchema, { code: 'CT', name: 'Cuti', maxDaysPerYear: 1.5 })).toBe(false);
  expect(ok(createLeaveTypeSchema, { code: 'CT', name: 'Cuti', maxDaysPerYear: -2 })).toBe(false);
  expect(ok(createLeaveTypeSchema, { code: 'CT', name: 'Cuti', maxDaysPerYear: 12 })).toBe(true);
  expect(ok(updateLeaveTypeSchema, { maxDaysPerYear: 2.5 })).toBe(false);
});

test('nama kosong / spasi saja ditolak saat PATCH', () => {
  expect(ok(updateLeaveTypeSchema, { name: '' })).toBe(false);
  expect(ok(updateLeaveTypeSchema, { name: '   ' })).toBe(false);
  expect(ok(createLeaveTypeSchema, { code: 'CT', name: '  ' })).toBe(false);
});

test('isActive diterima di skema update', () => {
  const r = safeParse(updateLeaveTypeSchema, { isActive: false });
  expect(r.success).toBe(true);
  expect(r.output.isActive).toBe(false);
});

test('tarif uang pengganti negatif ditolak', () => {
  expect(ok(updateLeaveTypeSchema, { unusedDayPayoutRate: -1 })).toBe(false);
});
