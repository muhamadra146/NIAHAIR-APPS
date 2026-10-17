'use strict';

// Regression: QA G3-29b (2026-10-15) — PATCH /notifications/:id/read untuk notifikasi orang lain /
// id asal tetap 200.

jest.mock('./notification.repository');
jest.mock('../division/division.repository', () => ({}));
jest.mock('../../common/utils/mailer', () => ({ sendMail: jest.fn() }));

const repo = require('./notification.repository');
const svc  = require('./notification.service');

beforeEach(() => jest.clearAllMocks());

test('notifikasi bukan milik user / tidak ada → 404', async () => {
  repo.markRead.mockResolvedValue({ count: 0 });
  repo.findOwned.mockResolvedValue(null);
  await expect(svc.markRead('u1', 'n-orang-lain')).rejects.toMatchObject({ statusCode: 404 });
});

test('notifikasi sendiri yang belum dibaca → sukses', async () => {
  repo.markRead.mockResolvedValue({ count: 1 });
  await expect(svc.markRead('u1', 'n1')).resolves.toEqual({ count: 1 });
  expect(repo.findOwned).not.toHaveBeenCalled();
});

test('notifikasi sendiri yang sudah dibaca → tetap sukses', async () => {
  repo.markRead.mockResolvedValue({ count: 0 });
  repo.findOwned.mockResolvedValue({ id: 'n1' });
  await expect(svc.markRead('u1', 'n1')).resolves.toEqual({ count: 0 });
});
