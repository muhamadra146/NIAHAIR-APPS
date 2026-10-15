'use strict';

// Regression: G1-26 — PATCH catatan konsultasi menerima interestingNote "" (kosong).
// Found by /qa on 2026-10-15

const v = require('valibot');
const { updateNoteSchema } = require('./consultation.validation');

test('interestingNote kosong ditolak', () => {
  const r = v.safeParse(updateNoteSchema, { interestingNote: '' });
  expect(r.success).toBe(false);
  expect(r.issues[0].message).toBe('Catatan wajib diisi');
});

test('interestingNote tidak dikirim tetap boleh (partial update)', () => {
  expect(v.safeParse(updateNoteSchema, {}).success).toBe(true);
});

test('interestingNote berisi diterima', () => {
  expect(v.safeParse(updateNoteSchema, { interestingNote: 'Rambut tipis' }).success).toBe(true);
});
