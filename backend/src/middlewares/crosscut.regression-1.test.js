'use strict';

// Regression: QA 2026-10-15 lintas modul —
//  G1-09/G3-17: tanggal/status rusak → 500;  G1-22/G3-27: create dengan rujukan tidak ada → pesan "Tidak bisa dihapus";
//  G3-28: meta page:null;  G3-06: token akun nonaktif tetap diterima;  G1-18: upload tipe salah → 500.
// Report: .gstack/qa-reports/run-20261015T083444Z/qa-report-localhost-2026-10-15.md

jest.mock('../modules/auth/auth.repository', () => ({ findActiveStatus: jest.fn() }));
jest.mock('../utils/logger', () => ({ warn: jest.fn(), error: jest.fn(), info: jest.fn() }));

const jwt          = require('jsonwebtoken');
const errorHandler = require('./error.middleware');
const authenticate = require('./auth.middleware');
const authRepo     = require('../modules/auth/auth.repository');
const { paginationMeta } = require('../utils/pagination');

const res = () => { const r = {}; r.status = jest.fn(() => r); r.json = jest.fn(() => r); return r; };
const run = (err, method = 'POST') => { const r = res(); errorHandler(err, { method, path: '/x' }, r, jest.fn()); return { status: r.status.mock.calls[0][0], body: r.json.mock.calls[0][0] }; };

describe('error handler', () => {
  test('input tidak valid yang sampai ke Prisma → 400, bukan 500', () => {
    const e = Object.assign(new Error('Invalid value for argument `visitDate`'), { name: 'PrismaClientValidationError' });
    expect(run(e).status).toBe(400);
  });

  test('tanggal rusak (RangeError Invalid time value) → 400', () => {
    expect(run(new RangeError('Invalid time value')).status).toBe(400);
  });

  test('P2003 saat membuat → 400 "Data terkait tidak ditemukan"; saat menghapus → 409', () => {
    const e = Object.assign(new Error('fk'), { code: 'P2003' });
    expect(run(e, 'POST')).toMatchObject({ status: 400, body: expect.objectContaining({ message: 'Data terkait tidak ditemukan' }) });
    expect(run(e, 'DELETE').status).toBe(409);
  });

  test('file ditolak Cloudinary → 400', () => {
    expect(run(Object.assign(new Error('Invalid image file'), { http_code: 400 })).status).toBe(400);
  });

  test('error lain tetap 500', () => {
    expect(run(new Error('boom')).status).toBe(500);
  });
});

test('paginationMeta menormalkan page/limit yang tidak valid', () => {
  expect(paginationMeta(30, 'abc', 'xyz')).toEqual({ total: 30, page: 1, limit: 10, totalPages: 3 });
  expect(paginationMeta(5, 0, 0)).toEqual({ total: 5, page: 1, limit: 10, totalPages: 1 });
});

describe('authenticate', () => {
  beforeAll(() => { process.env.JWT_SECRET = 'test-secret'; });
  const call = async () => {
    const req = { headers: { authorization: 'Bearer ' + jwt.sign({ id: 'u1' }, 'test-secret') } };
    const next = jest.fn();
    await authenticate(req, {}, next);
    return { req, err: next.mock.calls[0][0] };
  };

  test('akun aktif → lanjut, req.user terisi', async () => {
    authRepo.findActiveStatus.mockResolvedValue({ isActive: true, employee: { isActive: true } });
    const { req, err } = await call();
    expect(err).toBeUndefined();
    expect(req.user.id).toBe('u1');
  });

  test.each([
    ['akun dinonaktifkan', { isActive: false, employee: { isActive: true } }],
    ['karyawan dinonaktifkan', { isActive: true, employee: { isActive: false } }],
    ['akun sudah dihapus', null],
  ])('%s → 401 walau token belum kedaluwarsa', async (_, status) => {
    authRepo.findActiveStatus.mockResolvedValue(status);
    const { err } = await call();
    expect(err).toMatchObject({ statusCode: 401 });
  });
});
