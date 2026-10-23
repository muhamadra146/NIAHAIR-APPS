'use strict';

// Regression: QA Kehadiran (2026-10-19) — notifikasi pengajuan yang dibatalkan masih berbunyi
// "Menunggu persetujuan Anda"; notifikasi keputusan tidak menyebut tanggal.

jest.mock('./notification.repository');
jest.mock('../division/division.repository', () => ({ findEmployeeScope: jest.fn(), findDivisionManagers: jest.fn() }));
jest.mock('../../common/utils/mailer', () => ({ sendMail: jest.fn().mockResolvedValue() }));

const repo = require('./notification.repository');
const svc  = require('./notification.service');

beforeEach(() => {
  jest.clearAllMocks();
  repo.findEmployeeName.mockResolvedValue({ name: 'Staff Op' });
  repo.findUsersByEmployeeIds.mockResolvedValue([{ id: 'u1' }]);
  repo.createMany.mockResolvedValue({ count: 1 });
  repo.updateRequestNotifications.mockResolvedValue({ count: 2 });
});

test('requestCancelled memperbarui notifikasi penyetuju yang cocok & menandainya dibaca', async () => {
  const since = new Date('2026-11-02T03:00:00Z');
  const n = await svc.requestCancelled('LEAVE', { employeeId: 'e1', detail: '9 Nov 2026 – 11 Nov 2026', since });
  expect(n).toBe(2);
  const arg = repo.updateRequestNotifications.mock.calls[0][0];
  expect(arg).toMatchObject({ type: 'LEAVE_REQUEST', messageContains: 'Staff Op mengajukan cuti (9 Nov 2026 – 11 Nov 2026' });
  expect(arg.since.getTime()).toBeLessThan(since.getTime());
  expect(arg.data).toMatchObject({ title: 'Pengajuan cuti dibatalkan — Staff Op', isRead: true });
  expect(arg.data.message).not.toMatch(/Menunggu persetujuan/);
});

test('requestDecided menyebut tanggal pengajuan', async () => {
  await svc.requestDecided('SICK', { employeeId: 'e1', approved: true, detail: '2 Nov 2026 – 3 Nov 2026' });
  expect(repo.createMany.mock.calls[0][0][0].message).toBe('Pengajuan sakit Anda (2 Nov 2026 – 3 Nov 2026) telah disetujui.');
});

test('requestRevoked memberi tahu karyawan bahwa cuti yang disetujui dibatalkan', async () => {
  await svc.requestRevoked('LEAVE', { employeeId: 'e1', detail: '9 Nov 2026 – 11 Nov 2026, 3 hari kerja', note: 'Jatah 3 hari dikembalikan.' });
  const row = repo.createMany.mock.calls[0][0][0];
  expect(row.title).toBe('Cuti Anda dibatalkan');
  expect(row.message).toContain('Jatah 3 hari dikembalikan.');
});

test('kegagalan repo tidak melempar galat', async () => {
  repo.updateRequestNotifications.mockRejectedValue(new Error('db'));
  await expect(svc.requestCancelled('PERMISSION', { employeeId: 'e1', detail: 'x' })).resolves.toBe(0);
});
