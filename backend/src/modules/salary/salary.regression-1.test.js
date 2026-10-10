'use strict';

// Regression: isian Setting Gaji terbuang saat disimpan
//   - tunjangan, JHT/JP Perusahaan % tidak ada di skema validasi → dibuang valibot
//   - potongan terlambat 3 tingkat tidak dipetakan di service → selalu nilai bawaan
// Found by /qa on 2026-10-10

jest.mock('./salary.repository', () => ({
  findById:           jest.fn(),
  create:             jest.fn(),
  deactivatePrevious: jest.fn(),
  update:             jest.fn(),
}));

const { safeParse } = require('valibot');
const repo = require('./salary.repository');
const { createSalarySchema, updateSalarySchema } = require('./salary.validation');
const { createSetting, updateSetting } = require('./salary.service');

const FORM = {
  baseSalary: 3000000, tunjangan: 500000,
  lateDeductionBracket1: 10000, lateDeductionBracket2: 20000, lateDeductionBracket3: 30000,
  bpjsJhtEmployerPercent: 4, bpjsJpEmployerPercent: 2.5,
};

beforeEach(() => jest.clearAllMocks());

test('validasi meneruskan semua isian form (tidak ada yang dibuang)', () => {
  const create = safeParse(createSalarySchema, { employeeId: 'e1', effectiveDate: '2026-10-01', ...FORM });
  const update = safeParse(updateSalarySchema, FORM);
  expect(create.success).toBe(true);
  expect(update.success).toBe(true);
  for (const key of Object.keys(FORM)) {
    expect(create.output).toHaveProperty(key, FORM[key]);
    expect(update.output).toHaveProperty(key, FORM[key]);
  }
});

test('createSetting menyimpan tunjangan, potongan terlambat & BPJS perusahaan dari form', async () => {
  repo.create.mockResolvedValue({ id: 's1', isActive: false });
  await createSetting({ employeeId: 'e1', effectiveDate: '2026-10-01', isActive: false, ...FORM });
  expect(repo.create).toHaveBeenCalledWith(expect.objectContaining(FORM));
});

test('updateSetting menyimpan tunjangan, potongan terlambat & BPJS perusahaan dari form', async () => {
  repo.findById.mockResolvedValue({ id: 's1', employeeId: 'e1', isActive: false });
  repo.update.mockResolvedValue({ id: 's1', isActive: false });
  await updateSetting('s1', FORM);
  expect(repo.update).toHaveBeenCalledWith('s1', expect.objectContaining(FORM));
});
