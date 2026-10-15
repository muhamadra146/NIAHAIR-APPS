'use strict';

// Satu email per orang (keputusan user 2026-10-15): email login = email profil karyawan.
// Diubah dari form User atau form Karyawan, keduanya selalu sama; email orang lain ditolak.

jest.mock('./user.repository');
jest.mock('../employee/employee.repository');
jest.mock('../../config/cloudinary', () => ({ uploader: { destroy: jest.fn() } }));

const userRepo = require('./user.repository');
const empRepo  = require('../employee/employee.repository');
const userSvc  = require('./user.service');
const empSvc   = require('../employee/employee.service');

const USER = { id: 'u1', username: 'office', email: 'office@x.id', employeeId: 'e1', role: { id: 'r1' } };
const EMP  = { id: 'e1', name: 'Office', email: 'office@x.id', roleId: 'r1', user: { id: 'u1', email: 'office@x.id' } };

beforeEach(() => {
  jest.clearAllMocks();
  userRepo.findById.mockResolvedValue(USER);
  userRepo.update.mockImplementation(async (id, data) => ({ ...USER, ...data }));
  empRepo.findById.mockResolvedValue(EMP);
  empRepo.update.mockImplementation(async (id, data) => ({ ...EMP, ...data }));
  // Default: email belum dipakai siapa pun
  userRepo.findByEmail.mockResolvedValue(null);
  userRepo.findEmployeeByEmail.mockResolvedValue(null);
  empRepo.findByEmail.mockResolvedValue(null);
  empRepo.findUserByEmail.mockResolvedValue(null);
});

describe('ubah email dari form User', () => {
  test('email karyawan ikut diperbarui', async () => {
    await userSvc.updateUser('u1', { email: 'baru@x.id' });
    expect(userRepo.update).toHaveBeenCalledWith('u1', { email: 'baru@x.id' }, 'e1');
  });

  test('email yang dipakai karyawan lain ditolak', async () => {
    userRepo.findEmployeeByEmail.mockResolvedValue({ id: 'e2' });
    await expect(userSvc.updateUser('u1', { email: 'kasir@x.id' })).rejects.toMatchObject({ statusCode: 409 });
    expect(userRepo.update).not.toHaveBeenCalled();
  });

  test('ganti role tanpa ganti email tidak menyentuh data karyawan', async () => {
    userRepo.findUserRoleById.mockResolvedValue({ id: 'r2' });
    await userSvc.updateUser('u1', { roleId: 'r2' });
    expect(userRepo.update).toHaveBeenCalledWith('u1', { roleId: 'r2' });
  });
});

describe('buat akun user', () => {
  test('email login milik karyawan lain ditolak', async () => {
    userRepo.findUserRoleById.mockResolvedValue({ id: 'r1' });
    userRepo.findEmployeeById.mockResolvedValue({ id: 'e1' });
    userRepo.findEmployeeByEmail.mockResolvedValue({ id: 'e9' });
    await expect(userSvc.createUser({ username: 'baru', email: 'dipakai@x.id', password: '123456', userRoleId: 'r1', employeeId: 'e1' }))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(userRepo.create).not.toHaveBeenCalled();
  });
});

describe('ubah email dari form Karyawan', () => {
  test('email login akunnya ikut diperbarui', async () => {
    await empSvc.updateEmployee('e1', { email: 'baru@x.id' }, { roleCode: 'SUPER_ADMIN' });
    expect(empRepo.update).toHaveBeenCalledWith('e1', expect.objectContaining({ email: 'baru@x.id' }), 'u1');
  });

  test('email login orang lain ditolak', async () => {
    empRepo.findUserByEmail.mockResolvedValue({ id: 'u2', employeeId: 'e2' });
    await expect(empSvc.updateEmployee('e1', { email: 'kasir@x.id' }, { roleCode: 'SUPER_ADMIN' })).rejects.toMatchObject({ statusCode: 409 });
  });

  test('karyawan berakun tidak boleh mengosongkan email', async () => {
    await expect(empSvc.updateEmployee('e1', { email: '' }, { roleCode: 'SUPER_ADMIN' })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('karyawan tanpa akun: email hanya di data karyawan', async () => {
    empRepo.findById.mockResolvedValue({ ...EMP, user: null });
    await empSvc.updateEmployee('e1', { email: 'baru@x.id' }, { roleCode: 'SUPER_ADMIN' });
    expect(empRepo.update).toHaveBeenCalledWith('e1', expect.objectContaining({ email: 'baru@x.id' }), null);
  });
});
