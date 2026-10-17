'use strict';

// Regression: QA G3-24 (2026-10-15) — kode role karyawan tidak dinormalisasi (duplikat beda huruf).

jest.mock('./employeeRole.repository');

const repo = require('./employeeRole.repository');
const svc  = require('./employeeRole.service');

beforeEach(() => {
  jest.clearAllMocks();
  repo.findByCode.mockResolvedValue(null);
  repo.create.mockImplementation(async (d) => d);
  repo.update.mockImplementation(async (id, d) => d);
  repo.findById.mockResolvedValue({ id: 'r1', code: 'STYLIST' });
});

test('kode disimpan huruf besar tanpa spasi tepi', async () => {
  await svc.createEmployeeRole({ code: '  senior stylist ', name: ' Senior Stylist ' });
  expect(repo.findByCode).toHaveBeenCalledWith('SENIOR_STYLIST');
  expect(repo.create).toHaveBeenCalledWith({ code: 'SENIOR_STYLIST', name: 'Senior Stylist' });
});

test('kode yang sama beda huruf terdeteksi duplikat', async () => {
  repo.findByCode.mockResolvedValue({ id: 'r9', code: 'STYLIST' });
  await expect(svc.createEmployeeRole({ code: 'stylist', name: 'x' })).rejects.toMatchObject({ statusCode: 409 });
});

test('update dengan kode sama beda huruf tidak dianggap berubah', async () => {
  await svc.updateEmployeeRole('r1', { code: 'stylist' });
  expect(repo.findByCode).not.toHaveBeenCalled();
});
