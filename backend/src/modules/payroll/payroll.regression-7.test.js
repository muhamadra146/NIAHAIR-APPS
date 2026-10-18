'use strict';

// QA 2026-10-18 — siklus payroll:
//   · generate untuk periode di luar masa kerja → 422 "Periode di luar masa kerja karyawan"
//   · Kembalikan ke Draft (PENDING_APPROVAL → DRAFT)
//   · status sinkron jurnal (FAILED + pesan) dan "Coba lagi"
//   · tanggal gajian 1–31 dengan pesan Indonesia
jest.mock('./payroll.repository');
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn(), retrySync: jest.fn() }));
jest.mock('../notification/notification.service', () => ({ payrollPending: jest.fn() }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));

const { safeParse } = require('valibot');
const repo = require('./payroll.repository');
const svc  = require('./payroll.service');
const { createSyncJob, retrySync } = require('../syncQueue/syncQueue.service');
const { isOutsideEmployment } = require('./payroll.calc');
const { bulkGenerateSchema, generateSchema } = require('./payroll.validation');

beforeEach(() => jest.clearAllMocks());

describe('masa kerja', () => {
  const P = { periodStart: new Date('2026-08-01'), periodEnd: new Date('2026-08-31') };

  test('isOutsideEmployment', () => {
    expect(isOutsideEmployment({ ...P, hireDate: new Date('2026-09-04') })).toBe(true);           // seluruhnya sebelum masuk
    expect(isOutsideEmployment({ ...P, resignDate: new Date('2026-07-31') })).toBe(true);         // seluruhnya sesudah resign
    expect(isOutsideEmployment({ ...P, hireDate: new Date('2026-08-31') })).toBe(false);          // masuk hari terakhir → proporsional
    expect(isOutsideEmployment({ ...P, resignDate: new Date('2026-08-01') })).toBe(false);
    expect(isOutsideEmployment({ ...P })).toBe(false);
  });

  test('generate periode sebelum Tanggal Masuk → 422, tidak membuat payroll', async () => {
    repo.findOverlapping.mockResolvedValue(null);
    repo.findScheduleDates.mockResolvedValue([]);
    repo.findPreviousPayroll.mockResolvedValue(null);
    repo.getGenerationData.mockResolvedValue({
      salarySetting: { baseSalary: 3000000 }, schedules: [], attendances: [], commissions: [], activeLoans: [],
      unusedLeavePayouts: [], approvedLatePermissions: [], holidays: [], omsetBonusTiers: [], branchOmset: 0,
      employment: { hireDate: new Date('2026-09-04'), resignDate: null },
    });
    await expect(svc.generate({ employeeId: 'e1', branchId: 'b1', periodStart: '2026-08-01', periodEnd: '2026-08-31' }, 'u1'))
      .rejects.toMatchObject({ statusCode: 422, message: 'Periode di luar masa kerja karyawan' });
    expect(require('../../config/prisma').$transaction).not.toHaveBeenCalled();
  });
});

describe('Kembalikan ke Draft', () => {
  test('PENDING_APPROVAL → DRAFT, data pengajuan dikosongkan', async () => {
    repo.findById.mockResolvedValue({ id: 'pr1', status: 'PENDING_APPROVAL' });
    repo.update.mockResolvedValue({ id: 'pr1', status: 'DRAFT' });
    await expect(svc.revertToDraft('pr1')).resolves.toMatchObject({ status: 'DRAFT' });
    expect(repo.update).toHaveBeenCalledWith('pr1', { status: 'DRAFT', submittedBy: null, submittedAt: null });
  });

  test.each(['DRAFT', 'APPROVED', 'PAID'])('%s tidak bisa dikembalikan → 422', async (status) => {
    repo.findById.mockResolvedValue({ id: 'pr1', status });
    await expect(svc.revertToDraft('pr1')).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('status sinkron jurnal Accurate', () => {
  const PAID = { id: 'pr1', status: 'PAID', accurateJournalId: null };

  test('job FAILED → accurateSync FAILED + pesan (bukan "Pending")', async () => {
    repo.findById.mockResolvedValue(PAID);
    repo.findPayrollSyncJobs.mockResolvedValue([{ id: 'j2', entityId: 'pr1', status: 'FAILED', errorMessage: 'Accurate menolak jurnal: X' }]);
    const p = await svc.getById('pr1');
    expect(p.accurateSync).toEqual({ status: 'FAILED', errorMessage: 'Accurate menolak jurnal: X', jobId: 'j2' });
  });

  test('sudah ada jurnal → SYNCED; payroll belum dibayar → tanpa status sinkron', async () => {
    repo.findAll.mockResolvedValue([{ ...PAID, accurateJournalId: '79468' }, { id: 'pr2', status: 'DRAFT' }]);
    repo.count.mockResolvedValue(2);
    const { data } = await svc.getAll({ page: 1, limit: 10 });
    expect(data[0].accurateSync.status).toBe('SYNCED');
    expect(data[1].accurateSync).toBeUndefined();
    expect(repo.findPayrollSyncJobs).not.toHaveBeenCalled();
  });

  test('Coba lagi: job FAILED diulang', async () => {
    repo.findById.mockResolvedValue(PAID);
    repo.findPayrollSyncJobs.mockResolvedValue([{ id: 'j2', entityId: 'pr1', status: 'FAILED' }]);
    await svc.retryAccurateSync('pr1');
    expect(retrySync).toHaveBeenCalledWith('j2');
    expect(createSyncJob).not.toHaveBeenCalled();
  });

  test('Coba lagi tanpa job → job baru dibuat', async () => {
    repo.findById.mockResolvedValue(PAID);
    repo.findPayrollSyncJobs.mockResolvedValue([]);
    await svc.retryAccurateSync('pr1');
    expect(createSyncJob).toHaveBeenCalledWith({ entityType: 'PAYROLL', entityId: 'pr1', direction: 'APP_TO_ACCURATE' });
  });

  test('Coba lagi untuk payroll belum PAID / sudah terjurnal → 422', async () => {
    repo.findById.mockResolvedValue({ id: 'pr1', status: 'APPROVED' });
    await expect(svc.retryAccurateSync('pr1')).rejects.toMatchObject({ statusCode: 422 });
    repo.findById.mockResolvedValue({ ...PAID, accurateJournalId: '1' });
    await expect(svc.retryAccurateSync('pr1')).rejects.toMatchObject({ statusCode: 422 });
  });
});

describe('tanggal gajian 1–31', () => {
  const MSG = 'Tanggal gajian harus bilangan bulat 1–31';

  test.each([45, 0, 4.5])('bulk generate payDay %s ditolak dengan pesan Indonesia', (payDay) => {
    const r = safeParse(bulkGenerateSchema, { branchId: 'b1', yearMonth: '2026-11', payDay });
    expect(r.success).toBe(false);
    expect(r.issues[0].message).toBe(MSG);
  });

  test('payDay valid / kosong diterima', () => {
    expect(safeParse(bulkGenerateSchema, { branchId: 'b1', yearMonth: '2026-11', payDay: 31 }).success).toBe(true);
    expect(safeParse(generateSchema, { employeeId: 'e1', branchId: 'b1', yearMonth: '2026-11' }).success).toBe(true);
  });

  test('pratinjau periode payDay 45 → 400', async () => {
    await expect(svc.previewPeriod({ payDay: '45', yearMonth: '2026-11' })).rejects.toMatchObject({ statusCode: 400, message: MSG });
  });

  test('validateBody: pesan utama = pesan masalah pertama', () => {
    const { validateBody } = require('./payroll.validation');
    const next = jest.fn();
    validateBody(bulkGenerateSchema)({ body: { branchId: 'b1', yearMonth: '2026-11', payDay: 45 } }, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 422, message: MSG });
  });
});
