'use strict';

// Regression: G1-23 — POST /customers menerima nama berisi spasi saja dan tanggal lahir di masa depan.
// Found by /qa on 2026-10-15

const v = require('valibot');
const { createCustomerSchema, updateCustomerSchema } = require('./customer.validation');
const { wibDateStr } = require('../../utils/date');

const BASE = { name: 'QA-FIX-G1 Ani', mobilePhone: '081234567890' };
const parse = (schema, body) => v.safeParse(schema, body);

test('nama spasi saja ditolak (create & update)', () => {
  expect(parse(createCustomerSchema, { ...BASE, name: '   ' }).success).toBe(false);
  expect(parse(updateCustomerSchema, { name: '   ' }).success).toBe(false);
});

test('nama di-trim', () => {
  expect(parse(createCustomerSchema, { ...BASE, name: '  Ani  ' }).output.name).toBe('Ani');
});

test('tanggal lahir di masa depan ditolak (create & update)', () => {
  const r = parse(createCustomerSchema, { ...BASE, birthDate: '2999-01-01' });
  expect(r.success).toBe(false);
  expect(r.issues[0].message).toBe('Tanggal lahir tidak boleh di masa depan');
  expect(parse(updateCustomerSchema, { birthDate: '2999-01-01' }).success).toBe(false);
});

test('tanggal lahir hari ini / masa lalu diterima', () => {
  expect(parse(createCustomerSchema, { ...BASE, birthDate: wibDateStr() }).success).toBe(true);
  expect(parse(createCustomerSchema, { ...BASE, birthDate: '1990-05-01' }).success).toBe(true);
});

test('tanggal lahir format salah → pesan format, bukan "masa depan"', () => {
  const r = parse(createCustomerSchema, { ...BASE, birthDate: 'not-a-date' });
  expect(r.success).toBe(false);
  expect(r.issues[0].message).toBe('Format tanggal tidak valid (YYYY-MM-DD)');
  expect(parse(createCustomerSchema, { ...BASE, birthDate: '1990-13-45' }).success).toBe(false);
});
