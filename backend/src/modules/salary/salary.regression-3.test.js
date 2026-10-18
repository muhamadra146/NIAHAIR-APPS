'use strict';

// Regression — UI QA 2026-10-18: pesan validasi Setting Gaji berbahasa Inggris
// ("Invalid value: Expected >=0 …") dan "No active salary setting found".
jest.mock('./salary.repository');

const { safeParse } = require('valibot');
const repo = require('./salary.repository');
const svc  = require('./salary.service');
const { createSalarySchema, updateSalarySchema } = require('./salary.validation');

const ENGLISH = /Invalid|Expected|Received/;

test('update: nominal negatif → pesan Indonesia dengan nama field', () => {
  const r = safeParse(updateSalarySchema, { mealAllowancePerDay: -1, baseSalary: -5 });
  expect(r.success).toBe(false);
  const msgs = r.issues.map((i) => i.message);
  expect(msgs).toEqual(expect.arrayContaining(['Uang makan per hari tidak boleh negatif', 'Gaji pokok tidak boleh negatif']));
  msgs.forEach((m) => expect(m).not.toMatch(ENGLISH));
});

test('setiap aturan punya pesan Indonesia (tipe salah di semua field)', () => {
  const bad = {
    employeeId: 1, baseSalary: 'x', mealAllowancePerDay: 'x', tunjangan: 'x', transportAllowance: 'x',
    overtimeRatePerHour: 'x', holidayRatePerDay: 'x', lateDeductionPerMinute: 'x', lateDeductionBracket1: 'x',
    lateDeductionBracket2: 'x', lateDeductionBracket3: 'x', absentDeductionPerDay: 'x',
    earlyLeaveDeductionPerMinute: 'x', bpjsJhtPercent: 'x', effectiveDate: 1, endDate: 1, isActive: 'x', notes: 1,
  };
  for (const schema of [createSalarySchema, updateSalarySchema]) {
    const r = safeParse(schema, bad, { abortEarly: false });
    expect(r.success).toBe(false);
    r.issues.forEach((i) => expect(i.message).not.toMatch(ENGLISH));
  }
});

test('setting gaji aktif tidak ada → 404 berbahasa Indonesia', async () => {
  repo.findActiveByEmployee.mockResolvedValue(null);
  await expect(svc.getActive('e1')).rejects.toMatchObject({ statusCode: 404, message: 'Setting gaji aktif tidak ditemukan' });
});
