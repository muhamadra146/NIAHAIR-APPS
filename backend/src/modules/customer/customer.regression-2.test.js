'use strict';

// Regression: QA Data menu 2026-10-18 — B1 (duplikat 08/628/+62 & email beda huruf), B2 (tanggal
// mustahil 2026-02-31), B3 (perubahan pelanggan tidak sampai ke Accurate), B4 (kolom opsional tidak
// bisa dikosongkan), B5 (batas panjang & pesan error Accurate), pencarian "%" harfiah.

jest.mock('./customer.repository', () => ({
  findAll:           jest.fn(),
  count:             jest.fn(),
  findById:          jest.fn(),
  findByCustomerNo:  jest.fn(),
  findByPhone:       jest.fn(),
  findByEmail:       jest.fn(),
  findMaxCustomerNo: jest.fn(),
  create:            jest.fn(),
  update:            jest.fn(),
}));
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn().mockResolvedValue({}) }));

const v = require('valibot');
const repo = require('./customer.repository');
const { createSyncJob } = require('../syncQueue/syncQueue.service');
const { createCustomerSchema, updateCustomerSchema } = require('./customer.validation');
const { canonicalPhone, isRealDate, escapeLike } = require('./customer.fields');
const { mapCustomerToAccurate } = require('./customer.push.mapper');
const { createCustomer, updateCustomer, getAll } = require('./customer.service');

beforeEach(() => jest.clearAllMocks());

const BASE = { name: 'QA-DFIX Ani', mobilePhone: '081234567890' };
const parse = (schema, body) => v.safeParse(schema, body);

describe('B1 — nomor HP & email baku', () => {
  test.each([
    ['081234567890', '6281234567890'],
    ['6281234567890', '6281234567890'],
    ['+62 812-3456-7890', '6281234567890'],
    ['0812 3456 7890', '6281234567890'],
  ])('%s → %s', (input, expected) => {
    const r = parse(createCustomerSchema, { ...BASE, mobilePhone: input });
    expect(r.success).toBe(true);
    expect(r.output.mobilePhone).toBe(expected);
    expect(canonicalPhone(input)).toBe(expected);
  });

  test('format tetap divalidasi (bukan sekadar dibersihkan)', () => {
    expect(parse(createCustomerSchema, { ...BASE, mobilePhone: '12345' }).success).toBe(false);
    expect(parse(createCustomerSchema, { ...BASE, mobilePhone: '+1 555 0100' }).success).toBe(false);
  });

  test('email disimpan huruf kecil', () => {
    expect(parse(createCustomerSchema, { ...BASE, email: ' QA@Example.COM ' }).output.email).toBe('qa@example.com');
  });

  test('createCustomer mencari duplikat dengan nomor baku & menolak 409', async () => {
    repo.findByPhone.mockResolvedValue({ id: 'c9', name: 'Lama', customerNo: 'C.00001' });
    await expect(createCustomer({ ...BASE, mobilePhone: '081234567890' })).rejects.toMatchObject({ statusCode: 409 });
    expect(repo.findByPhone).toHaveBeenCalledWith('6281234567890');
  });

  test('updateCustomer: nomor sama dalam format lain tidak dianggap berubah', async () => {
    repo.findById.mockResolvedValue({ id: 'c1', name: 'A', mobilePhone: '+62 812-3456-7890' });
    repo.update.mockResolvedValue({ id: 'c1' });
    await updateCustomer('c1', { mobilePhone: '081234567890' });
    expect(repo.findByPhone).not.toHaveBeenCalled();
    expect(repo.update.mock.calls[0][1]).not.toHaveProperty('mobilePhone');
  });

  test('updateCustomer: email beda huruf besar/kecil dicek ke pelanggan lain (kecuali dirinya)', async () => {
    repo.findById.mockResolvedValue({ id: 'c1', name: 'A', email: null });
    repo.findByEmail.mockResolvedValue({ id: 'c2', name: 'B' });
    await expect(updateCustomer('c1', { email: 'B@X.COM' })).rejects.toMatchObject({ statusCode: 409 });
    expect(repo.findByEmail).toHaveBeenCalledWith('b@x.com', 'c1');
  });
});

describe('B2 — tanggal lahir harus tanggal yang ada', () => {
  test.each(['2026-02-31', '2025-02-29', '2026-04-31', '2026-13-01'])('%s ditolak', (d) => {
    expect(isRealDate(d)).toBe(false);
    expect(parse(createCustomerSchema, { ...BASE, birthDate: d }).success).toBe(false);
    expect(parse(updateCustomerSchema, { birthDate: d }).success).toBe(false);
  });

  test('2024-02-29 (kabisat) diterima', () => {
    expect(parse(createCustomerSchema, { ...BASE, birthDate: '2024-02-29' }).success).toBe(true);
  });
});

describe('B4 — kolom opsional bisa dikosongkan', () => {
  test.each(['email', 'address', 'city', 'province', 'notes', 'birthDate', 'gender'])('%s: null / "" → null', (f) => {
    const asNull = parse(updateCustomerSchema, { [f]: null });
    expect(asNull.success).toBe(true);
    expect(asNull.output[f]).toBeNull();
    if (f !== 'gender') {
      const asEmpty = parse(updateCustomerSchema, { [f]: '' });
      expect(asEmpty.success).toBe(true);
      expect(asEmpty.output[f]).toBeNull();
    }
  });

  test('updateCustomer meneruskan null ke repository', async () => {
    repo.findById.mockResolvedValue({ id: 'c1', name: 'A', address: 'Jl Lama', email: 'a@x.com' });
    repo.update.mockResolvedValue({ id: 'c1' });
    await updateCustomer('c1', { address: null, email: null });
    expect(repo.update.mock.calls[0][1]).toMatchObject({ address: null, email: null });
  });
});

describe('B5 — batas panjang = batas Accurate', () => {
  test.each([
    ['address', 256, 'Alamat maksimal 255 karakter'],
    ['city', 51, 'Kota maksimal 50 karakter'],
    ['province', 51, 'Provinsi maksimal 50 karakter'],
    ['name', 101, 'Nama maksimal 100 karakter'],
  ])('%s %i karakter ditolak', (f, len, msg) => {
    const r = parse(createCustomerSchema, { ...BASE, [f]: 'x'.repeat(len) });
    expect(r.success).toBe(false);
    expect(r.issues.map((i) => i.message)).toContain(msg);
  });
});

describe('B3 — perubahan pelanggan dikirim ke Accurate', () => {
  test('ubah nama → status PENDING + antrian APP_TO_ACCURATE', async () => {
    repo.findById.mockResolvedValue({ id: 'c1', name: 'Lama', accurateCustomerId: 40 });
    repo.update.mockResolvedValue({ id: 'c1' });
    await updateCustomer('c1', { name: 'Baru' });
    expect(repo.update.mock.calls[0][1]).toMatchObject({ name: 'Baru', syncStatus: 'PENDING' });
    expect(createSyncJob).toHaveBeenCalledWith({ entityType: 'CUSTOMER', entityId: 'c1', direction: 'APP_TO_ACCURATE' });
  });

  test('hanya kolom non-Accurate (tanggal lahir) → tidak diantrikan', async () => {
    repo.findById.mockResolvedValue({ id: 'c1', name: 'A', accurateCustomerId: 40 });
    repo.update.mockResolvedValue({ id: 'c1' });
    await updateCustomer('c1', { birthDate: '1990-01-01' });
    expect(createSyncJob).not.toHaveBeenCalled();
  });

  test('mapper: pelanggan yang sudah di Accurate dikirim dengan id dan kolom kosong ""', () => {
    const p = mapCustomerToAccurate({ accurateCustomerId: 40, name: 'A', mobilePhone: '628', email: null, address: null, city: 'Jkt', province: null, notes: null });
    expect(p).toEqual({ id: 40, name: 'A', mobilePhone: '628', email: '', billStreet: '', billCity: 'Jkt', billProvince: '', notes: '' });
  });

  test('mapper: pelanggan baru tanpa id & tanpa kolom kosong', () => {
    expect(mapCustomerToAccurate({ accurateCustomerId: null, name: 'A', mobilePhone: '628', email: null })).toEqual({ name: 'A', mobilePhone: '628' });
  });
});

describe('pencarian "%" / "_" harfiah', () => {
  test('escapeLike', () => {
    expect(escapeLike('50%_a\\b')).toBe('50\\%\\_a\\\\b');
  });

  test('getAll memakai kata kunci yang di-escape', async () => {
    repo.findAll.mockResolvedValue([]);
    repo.count.mockResolvedValue(0);
    await getAll({ search: '%' });
    const { where } = repo.findAll.mock.calls[0][0];
    expect(where.OR[0]).toEqual({ name: { contains: '\\%', mode: 'insensitive' } });
  });

  test('cari "0812…" juga mencari bentuk 62812…', async () => {
    repo.findAll.mockResolvedValue([]);
    repo.count.mockResolvedValue(0);
    await getAll({ search: '08123' });
    const { where } = repo.findAll.mock.calls[0][0];
    expect(where.OR).toContainEqual({ mobilePhone: { contains: '628123' } });
  });
});
