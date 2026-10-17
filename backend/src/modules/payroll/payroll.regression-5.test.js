'use strict';

// Regression: keputusan user 2026-10-17 — payroll dengan gaji bersih minus boleh dibuat
// (diberi peringatan), tapi tidak boleh disetujui sampai dicek & dihitung ulang.
jest.mock('./payroll.repository');
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));
jest.mock('../notification/notification.service', () => ({ payrollPending: jest.fn() }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));

const repo = require('./payroll.repository');
const svc  = require('./payroll.service');

beforeEach(() => jest.clearAllMocks());

test('setujui payroll dengan gaji bersih minus → 422, status tidak berubah', async () => {
  repo.findById.mockResolvedValue({ id: 'pr1', status: 'PENDING_APPROVAL', netSalary: '-1986150' });
  await expect(svc.approve('pr1', 'u1')).rejects.toMatchObject({ statusCode: 422 });
  expect(repo.update).not.toHaveBeenCalled();
});

test('setujui payroll dengan gaji bersih 0 atau positif → boleh', async () => {
  repo.update.mockResolvedValue({ id: 'pr1', status: 'APPROVED' });
  for (const netSalary of ['0', '2853333.33']) {
    repo.findById.mockResolvedValue({ id: 'pr1', status: 'PENDING_APPROVAL', netSalary });
    await expect(svc.approve('pr1', 'u1')).resolves.toMatchObject({ status: 'APPROVED' });
  }
  expect(repo.update).toHaveBeenCalledTimes(2);
});
