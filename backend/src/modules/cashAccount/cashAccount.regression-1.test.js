'use strict';

// Regression G5-10 — accurateAccountId harus bilangan bulat positif dalam batas INT (API QA 2026-10-15)
const { safeParse } = require('valibot');
const { createCashAccountSchema, updateCashAccountSchema } = require('./cashAccount.validation');

describe('accurateAccountId', () => {
  test.each([1e12, 1.5, -1, 0, 'abc'])('%p ditolak', (v) => {
    expect(safeParse(createCashAccountSchema, { code: 'K1', name: 'Kas', accurateAccountId: v }).success).toBe(false);
    expect(safeParse(updateCashAccountSchema, { accurateAccountId: v }).success).toBe(false);
  });

  test('bilangan bulat positif diterima', () => {
    expect(safeParse(createCashAccountSchema, { code: 'K1', name: 'Kas', accurateAccountId: 150 }).success).toBe(true);
  });

  test('nama hanya spasi ditolak', () => {
    expect(safeParse(updateCashAccountSchema, { name: '   ' }).success).toBe(false);
  });
});
