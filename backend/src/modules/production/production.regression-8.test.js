// Regression: B10 — hapus Penyelesaian/Pekerjaan Pesanan di Accurate best-effort (gagal diabaikan → ERP & Accurate beda)
// Found by /qa on 2026-10-18
'use strict';

jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('../branch/branch.repository', () => ({ getAccurateBranchId: jest.fn() }));
jest.mock('./production.sync.repository', () => ({}));

const { accurateRequest } = require('../accurate/accurate.client');
const { deleteFromAccurate } = require('./production.sync.service');

beforeEach(() => jest.clearAllMocks());

test('RO lalu JC dihapus; sukses → tidak throw', async () => {
  accurateRequest.mockResolvedValue({ s: true });
  await deleteFromAccurate({ accuratePekerjaanId: 11, accuratePenyelesaianId: 12 });
  expect(accurateRequest.mock.calls.map((c) => c[0])).toEqual(['/roll-over/delete.do?id=12', '/job-order/delete.do?id=11']);
});

test('Accurate menolak & dokumen masih ada → 422 (caller rollback)', async () => {
  accurateRequest.mockImplementation((ep) => Promise.resolve(ep.includes('detail') ? { s: true, d: {} } : { s: false, d: ['Periode dikunci'] }));
  await expect(deleteFromAccurate({ accuratePenyelesaianId: 12 })).rejects.toMatchObject({
    statusCode: 422, message: expect.stringContaining('Periode dikunci'),
  });
});

test('dokumen sudah tidak ada di Accurate → dianggap terhapus (aman diulang)', async () => {
  accurateRequest.mockResolvedValue({ s: false, d: ['Data tidak ditemukan'] });
  await expect(deleteFromAccurate({ accuratePekerjaanId: 11, accuratePenyelesaianId: 12 })).resolves.toBeUndefined();
});
