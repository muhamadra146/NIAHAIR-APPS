'use strict';

// Regression: QA G3 (2026-10-15)
//   G3-05 — MANAGER/OFFICE bisa menonaktifkan karyawan lewat PUT {isActive:false}
//   G3-08 — GET /employees(/:id) membuka NIK, alamat, tgl lahir, file, payDay ke staf
//   G3-09 — hapus permanen karyawan yang sudah punya riwayat (keputusan owner: tolak 409)
//   G3-10 — email beda huruf besar/kecil dianggap berbeda
//   G3-11 — kode karyawan bisa diubah (EMP-001)

jest.mock('./employee.repository');
jest.mock('../../config/cloudinary', () => ({ uploader: { destroy: jest.fn() } }));
jest.mock('../division/division.repository', () => ({ findById: jest.fn(), findEmployeeScope: jest.fn() }));

const { safeParse } = require('valibot');
const repo = require('./employee.repository');
const svc  = require('./employee.service');
const { createEmployeeSchema, updateEmployeeSchema } = require('./employee.validation');

const FULL = {
  id: 'e1', employeeCode: 'EMP001', name: 'Nia', isActive: true, roleId: 'r1',
  role: { id: 'r1', code: 'STYLIST', name: 'Stylist' },
  homeBranchId: 'b1', homeBranch: { id: 'b1' }, divisionId: null, division: null, isDivisionManager: false,
  employeeBranches: [], commissionEnabled: true,
  email: 'nia@salon.com', phone: '0812', nikKtp: '3201', address: 'Jl. Rahasia', birthDate: new Date('1990-01-01'),
  ktpFileUrl: 'https://x/ktp', contractFileUrl: 'https://x/c', payDay: 7, user: null,
};
const SENSITIVE = ['nikKtp', 'address', 'birthDate', 'ktpFileUrl', 'contractFileUrl', 'payDay', 'email', 'phone'];

const MANAGER = { id: 'u1', roleCode: 'MANAGER', employeeId: 'm1' };
const OWNER   = { id: 'u2', roleCode: 'OWNER',   employeeId: 'o1' };
const CASHIER = { id: 'u3', roleCode: 'CASHIER', employeeId: 'c1' };

beforeEach(() => {
  jest.clearAllMocks();
  repo.findById.mockResolvedValue({ ...FULL });
  repo.findAll.mockResolvedValue([{ ...FULL }, { ...FULL, id: 'c1' }]);
  repo.count.mockResolvedValue(2);
  repo.update.mockImplementation(async (id, data) => ({ ...FULL, ...data }));
  repo.findByEmail.mockResolvedValue(null);
  repo.findUserByEmail.mockResolvedValue(null);
  repo.countHistory.mockResolvedValue(0);
  repo.hardDelete.mockResolvedValue(undefined);
});

describe('G3-05 status aktif lewat PUT', () => {
  test('MANAGER mengubah isActive → 403, data tidak disimpan', async () => {
    await expect(svc.updateEmployee('e1', { isActive: false }, MANAGER)).rejects.toMatchObject({ statusCode: 403 });
    expect(repo.update).not.toHaveBeenCalled();
  });

  test('MANAGER mengirim isActive yang sama (form) → diabaikan, simpan jalan', async () => {
    await svc.updateEmployee('e1', { name: 'Nia B', isActive: true }, MANAGER);
    expect(repo.update.mock.calls[0][1]).not.toHaveProperty('isActive');
  });

  test('OWNER boleh mengubah isActive', async () => {
    await svc.updateEmployee('e1', { isActive: false }, OWNER);
    expect(repo.update.mock.calls[0][1].isActive).toBe(false);
  });
});

describe('G3-08 data sensitif hanya untuk peran pengelola / diri sendiri', () => {
  test('CASHIER melihat detail karyawan lain tanpa kolom sensitif', async () => {
    const res = await svc.getById('e1', CASHIER);
    SENSITIVE.forEach((f) => expect(res).not.toHaveProperty(f));
    expect(res).toMatchObject({ id: 'e1', name: 'Nia', employeeCode: 'EMP001' });
  });

  test('CASHIER melihat data dirinya sendiri lengkap', async () => {
    repo.findById.mockResolvedValue({ ...FULL, id: 'c1' });
    const res = await svc.getById('c1', CASHIER);
    expect(res.nikKtp).toBe('3201');
  });

  test('daftar karyawan untuk CASHIER: orang lain disaring, dirinya lengkap', async () => {
    const { data } = await svc.getAll({}, CASHIER);
    expect(data[0]).not.toHaveProperty('nikKtp');
    expect(data[1].nikKtp).toBe('3201');
  });

  test.each(['SUPER_ADMIN', 'OWNER', 'MANAGER', 'OFFICE', 'FINANCE'])('%s melihat semua kolom', async (roleCode) => {
    const res = await svc.getById('e1', { roleCode, employeeId: 'x' });
    expect(res.nikKtp).toBe('3201');
  });
});

describe('G3-09 hapus permanen', () => {
  test('karyawan punya riwayat → 409, tidak dihapus', async () => {
    repo.countHistory.mockResolvedValue(3);
    await expect(svc.deleteEmployee('e1')).rejects.toMatchObject({
      statusCode: 409, message: 'Karyawan sudah punya riwayat; nonaktifkan saja',
    });
    expect(repo.hardDelete).not.toHaveBeenCalled();
  });

  test('tanpa riwayat → dihapus', async () => {
    await svc.deleteEmployee('e1');
    expect(repo.hardDelete).toHaveBeenCalledWith('e1');
  });
});

describe('G3-10 email tidak peka huruf besar/kecil', () => {
  test('validasi menormalkan email (trim + huruf kecil)', () => {
    const r = safeParse(createEmployeeSchema, { name: 'A', roleId: 'r1', email: '  Nia@Salon.COM ' });
    expect(r.output.email).toBe('nia@salon.com');
    expect(safeParse(updateEmployeeSchema, { email: 'X@Y.Com' }).output.email).toBe('x@y.com');
  });

  test('email sama dengan beda huruf → dianggap tidak berubah', async () => {
    await svc.updateEmployee('e1', { email: 'NIA@salon.com' }, OWNER);
    expect(repo.findByEmail).not.toHaveBeenCalled();
  });

  test('buat karyawan: email disimpan huruf kecil & dicek duplikat', async () => {
    repo.findRoleById.mockResolvedValue({ id: 'r1' });
    repo.findByEmployeeCode.mockResolvedValue(null);
    repo.findByEmail.mockResolvedValue({ id: 'e9' });
    await expect(svc.createEmployee({ name: 'B', roleId: 'r1', employeeCode: 'EMP777', email: 'Nia@Salon.com' }, OWNER))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(repo.findByEmail).toHaveBeenCalledWith('nia@salon.com');
  });
});

describe('G3-11 kode karyawan tidak bisa diubah', () => {
  test('kode berbeda → 422', async () => {
    await expect(svc.updateEmployee('e1', { employeeCode: 'EMP999' }, OWNER)).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.update).not.toHaveBeenCalled();
  });

  test('kode sama → diabaikan', async () => {
    await svc.updateEmployee('e1', { employeeCode: 'EMP001', name: 'X' }, OWNER);
    expect(repo.update.mock.calls[0][1]).not.toHaveProperty('employeeCode');
  });
});
