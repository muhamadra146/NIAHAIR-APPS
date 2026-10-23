'use strict';

// Regression: QA Kehadiran (2026-10-19) — Pengaturan → Kuota Cuti menampilkan sisa = jatah − terpakai
// tanpa mengurangi pengajuan yang masih menunggu (EMP-012: sisa = jatah − terpakai − menunggu).

jest.mock('./leaveQuota.repository');
jest.mock('../leaveType/leaveType.repository');

const repo = require('./leaveQuota.repository');
const svc  = require('./leaveQuota.service');

beforeEach(() => jest.clearAllMocks());

test('daftar kuota menyertakan pendingDays & remainingDays per karyawan/jenis/tahun', async () => {
  repo.findAll.mockResolvedValue([
    { employeeId: 'e1', leaveTypeId: 'lt1', year: 2026, totalDays: 12, usedDays: 2 },
    { employeeId: 'e2', leaveTypeId: 'lt1', year: 2026, totalDays: 12, usedDays: 0 },
  ]);
  repo.count.mockResolvedValue(2);
  repo.sumPendingDaysMany.mockResolvedValue({ 'e1|lt1|2026': 3 });

  const { data } = await svc.getQuotas({});
  expect(data[0]).toMatchObject({ pendingDays: 3, remainingDays: 7 });
  expect(data[1]).toMatchObject({ pendingDays: 0, remainingDays: 12 });
});

test('daftar kosong tidak memanggil query menunggu', async () => {
  repo.findAll.mockResolvedValue([]);
  repo.count.mockResolvedValue(0);
  await svc.getQuotas({});
  expect(repo.sumPendingDaysMany).not.toHaveBeenCalled();
});
