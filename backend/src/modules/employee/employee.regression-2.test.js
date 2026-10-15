'use strict';

// Regression: ISSUE-001 — simpan form Edit Profil karyawan selalu 500: Prisma menolak divisionId (kolom)
// yang dicampur dengan relasi role/homeBranch ("Unknown argument `divisionId`").
// Found by /qa on 2026-10-15
// Report: .gstack/qa-reports/run-20261015T083444Z/qa-report-localhost-2026-10-15.md
// Value: protects=employee create/update writes division as a relation; fails_when=scalar divisionId is
// passed next to role/homeBranch connect; why_new=service tests mock the repository; seam=none;
// no_claim=Prisma engine acceptance (prisma client mocked; shape check only)

jest.mock('../../config/prisma', () => ({
  employee: { update: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}) },
  user:     { update: jest.fn().mockResolvedValue({}) },
  $transaction: jest.fn((fn) => fn(require('../../config/prisma'))),
}));

const prisma = require('../../config/prisma');
const repo   = require('./employee.repository');

beforeEach(() => jest.clearAllMocks());

const FORM = { name: 'OFFICE', roleId: 'r1', homeBranchId: 'b1', isDivisionManager: false };

describe.each([
  ['tanpa divisi',  null, { disconnect: true }],
  ['dengan divisi', 'd1', { connect: { id: 'd1' } }],
])('update karyawan %s', (_, divisionId, expected) => {
  test('divisi ditulis sebagai relasi, bukan kolom divisionId', async () => {
    await repo.update('e1', { ...FORM, divisionId });
    const { data } = prisma.employee.update.mock.calls[0][0];
    expect(data).not.toHaveProperty('divisionId');
    expect(data.division).toEqual(expected);
    expect(data.role).toEqual({ connect: { id: 'r1' } });
  });
});

test('update tanpa field divisionId tidak menyentuh divisi', async () => {
  await repo.update('e1', { name: 'X' });
  expect(prisma.employee.update.mock.calls[0][0].data).not.toHaveProperty('division');
});

test('buat karyawan dengan divisi memakai relasi', async () => {
  await repo.create({ ...FORM, divisionId: 'd1' });
  const { data } = prisma.employee.create.mock.calls[0][0];
  expect(data).not.toHaveProperty('divisionId');
  expect(data.division).toEqual({ connect: { id: 'd1' } });
});
