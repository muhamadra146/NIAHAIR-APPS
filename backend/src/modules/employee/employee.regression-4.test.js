'use strict';

// Regression: QA Data menu 2026-10-18 — B2 (tanggal mustahil), B4 (kolom tidak bisa dikosongkan),
// B11 (validasi nama/kode/HP/NIK/tgl lahir/tgl gajian), B13 (tanggal gajian opsional),
// B15 (cabang Utama mengikuti Home Branch), pesan email wajib untuk karyawan berakun.

jest.mock('./employee.repository');
jest.mock('../../config/cloudinary', () => ({ uploader: { destroy: jest.fn() } }));
jest.mock('../division/division.repository', () => ({ findById: jest.fn() }));

const v = require('valibot');
const repo = require('./employee.repository');
const svc = require('./employee.service');
const { createEmployeeSchema, updateEmployeeSchema } = require('./employee.validation');

const OWNER = { roleCode: 'OWNER' };
const BASE = { name: 'QA-DFIX Emp', roleId: 'r1' };
const parse = (schema, body) => v.safeParse(schema, body);
const msgs = (r) => (r.issues ?? []).map((i) => i.message);

beforeEach(() => jest.clearAllMocks());

describe('validasi', () => {
  test('B13: tanggal gajian boleh kosong (null / tidak dikirim)', () => {
    expect(parse(createEmployeeSchema, { ...BASE, payDay: null }).success).toBe(true);
    expect(parse(createEmployeeSchema, BASE).success).toBe(true);
  });

  test('tanggal gajian di luar 1..31 → pesan Indonesia', () => {
    expect(msgs(parse(createEmployeeSchema, { ...BASE, payDay: 0 }))).toContain('Tanggal gajian harus antara 1 dan 31');
    expect(msgs(parse(createEmployeeSchema, { ...BASE, payDay: 32 }))).toContain('Tanggal gajian harus antara 1 dan 31');
  });

  test('nama spasi saja ditolak & di-trim', () => {
    expect(msgs(parse(createEmployeeSchema, { ...BASE, name: '   ' }))).toContain('Nama wajib diisi');
    expect(parse(createEmployeeSchema, { ...BASE, name: ' Ani ' }).output.name).toBe('Ani');
  });

  test('B2: tanggal mustahil ditolak; tanggal lahir tidak boleh di masa depan', () => {
    expect(msgs(parse(createEmployeeSchema, { ...BASE, birthDate: '2026-02-31' }))).toContain('Tanggal lahir tidak valid');
    expect(msgs(parse(createEmployeeSchema, { ...BASE, hireDate: '2026-04-31' }))).toContain('Tanggal masuk tidak valid');
    expect(msgs(parse(createEmployeeSchema, { ...BASE, birthDate: '2999-01-01' }))).toContain('Tanggal lahir tidak boleh di masa depan');
  });

  test('NIK harus 16 digit bila diisi', () => {
    expect(msgs(parse(createEmployeeSchema, { ...BASE, nikKtp: '123' }))).toContain('NIK KTP harus 16 digit angka');
    expect(parse(createEmployeeSchema, { ...BASE, nikKtp: '3174012345678901' }).success).toBe(true);
  });

  test('No. HP: aturan sama dengan pelanggan, pemisah dibuang', () => {
    expect(parse(createEmployeeSchema, { ...BASE, phone: '0812-3456-7890' }).output.phone).toBe('081234567890');
    expect(parse(createEmployeeSchema, { ...BASE, phone: 'abc' }).success).toBe(false);
  });

  test('kode karyawan disimpan huruf besar', () => {
    expect(parse(createEmployeeSchema, { ...BASE, employeeCode: ' emp050 ' }).output.employeeCode).toBe('EMP050');
  });

  test.each(['phone', 'email', 'address', 'emergencyContact', 'nikKtp', 'birthDate', 'hireDate', 'resignDate'])(
    'B4: %s bisa dikosongkan (null / "")', (f) => {
      expect(parse(updateEmployeeSchema, { [f]: null }).output[f]).toBeNull();
      expect(parse(updateEmployeeSchema, { [f]: '' }).output[f]).toBeNull();
    },
  );
});

describe('service', () => {
  const EMP = { id: 'e1', name: 'A', employeeCode: 'EMP-ADMIN@-1c85d3', roleId: 'r1', email: 'a@x.com', homeBranchId: 'b1', user: { id: 'u1' } };

  test('email karyawan berakun tidak boleh dikosongkan', async () => {
    repo.findById.mockResolvedValue(EMP);
    await expect(svc.updateEmployee('e1', { email: null }, OWNER))
      .rejects.toMatchObject({ statusCode: 400, message: 'Email wajib diisi karena karyawan punya akun login' });
  });

  test('kode karyawan sama beda huruf → tidak dianggap berubah', async () => {
    repo.findById.mockResolvedValue(EMP);
    repo.update.mockResolvedValue(EMP);
    await svc.updateEmployee('e1', { employeeCode: 'EMP-ADMIN@-1C85D3' }, OWNER);
    expect(repo.update.mock.calls[0][1]).not.toHaveProperty('employeeCode');
  });

  test('create: kode dari input dicek tanpa beda huruf', async () => {
    repo.findRoleById.mockResolvedValue({ id: 'r1' });
    repo.findByEmployeeCode.mockResolvedValue({ id: 'other' });
    await expect(svc.createEmployee({ ...BASE, employeeCode: 'emp001' }, OWNER)).rejects.toMatchObject({ statusCode: 409 });
    expect(repo.findByEmployeeCode).toHaveBeenCalledWith('EMP001');
  });

  test('B15: create dengan Home Branch → cabang Utama disamakan', async () => {
    repo.findRoleById.mockResolvedValue({ id: 'r1' });
    repo.findLastEmployeeCode.mockResolvedValue(null);
    repo.findByEmployeeCode.mockResolvedValue(null);
    repo.create.mockResolvedValue({ id: 'e9', homeBranchId: 'b2' });
    repo.syncPrimaryBranch.mockResolvedValue({ id: 'e9', homeBranchId: 'b2', employeeBranches: [{ branchId: 'b2', isPrimary: true }] });
    const r = await svc.createEmployee({ ...BASE, homeBranchId: 'b2' }, OWNER);
    expect(repo.syncPrimaryBranch).toHaveBeenCalledWith('e9', 'b2');
    expect(r.employeeBranches[0].isPrimary).toBe(true);
  });

  test('B15: ubah Home Branch → cabang Utama ikut', async () => {
    repo.findById.mockResolvedValue(EMP);
    repo.update.mockResolvedValue(EMP);
    await svc.updateEmployee('e1', { homeBranchId: 'b3' }, OWNER);
    expect(repo.syncPrimaryBranch).toHaveBeenCalledWith('e1', 'b3');
  });

  test('update tanpa homeBranchId tidak menyentuh cabang', async () => {
    repo.findById.mockResolvedValue(EMP);
    repo.update.mockResolvedValue(EMP);
    await svc.updateEmployee('e1', { name: 'B' }, OWNER);
    expect(repo.syncPrimaryBranch).not.toHaveBeenCalled();
  });
});
