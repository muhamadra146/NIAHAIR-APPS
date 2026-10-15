'use strict';

// Regression: G1-25 — memberships: durationDays 1.5 diterima lalu terpotong diam-diam.
// Found by /qa on 2026-10-15

const v = require('valibot');
const validation = require('./membership.validation');

const BASE = { name: 'QA-FIX-G1 paket', price: 100000, durationDays: 30, discountType: 'PERCENTAGE', discountValue: 10 };

// Skema create/update paket = skema yang punya field durationDays
const schemas = Object.entries(validation).filter(([, s]) => s?.entries?.durationDays);

test('skema paket ditemukan', () => expect(schemas.length).toBeGreaterThanOrEqual(2));

test.each(schemas.map(([n]) => n))('%s: durationDays pecahan ditolak', (name) => {
  const r = v.safeParse(validation[name], { ...BASE, durationDays: 1.5 });
  expect(r.success).toBe(false);
  expect(r.issues.some((i) => i.message === 'Durasi harus bilangan bulat (hari)')).toBe(true);
});

test.each(schemas.map(([n]) => n))('%s: durationDays bulat diterima', (name) => {
  const r = v.safeParse(validation[name], { ...BASE, durationDays: 30 });
  expect(r.issues?.some((i) => i.path?.[0]?.key === 'durationDays') ?? false).toBe(false);
});
