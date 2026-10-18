'use strict';

// Regression: QA Data menu 2026-10-18 — B7: catatan berisi spasi saja diterima API;
// penulis catatan tampil sebagai email, bukan nama karyawan.

jest.mock('./customer.repository', () => ({ findById: jest.fn() }));
jest.mock('./customerNote.repository', () => ({
  findAllByCustomer:       jest.fn(),
  create:                  jest.fn(),
  findById:                jest.fn(),
  update:                  jest.fn(),
  remove:                  jest.fn(),
  findAuthorNameByUserId:  jest.fn(),
  findAuthorNamesByEmails: jest.fn(),
}));

const v = require('valibot');
const customerRepo = require('./customer.repository');
const noteRepo = require('./customerNote.repository');
const { createNoteSchema, updateNoteSchema } = require('./customerNote.validation');
const { getNotes, createNote } = require('./customerNote.service');

beforeEach(() => jest.clearAllMocks());

test.each([['create', createNoteSchema], ['update', updateNoteSchema]])('%s: catatan spasi saja ditolak', (_, schema) => {
  const r = v.safeParse(schema, { note: '   \n  ' });
  expect(r.success).toBe(false);
  expect(r.issues[0].message).toBe('Isi catatan tidak boleh kosong');
});

test('catatan di-trim', () => {
  expect(v.safeParse(createNoteSchema, { note: '  halo  ' }).output.note).toBe('halo');
});

test('createNote menyimpan nama karyawan pemilik akun', async () => {
  customerRepo.findById.mockResolvedValue({ id: 'c1' });
  noteRepo.findAuthorNameByUserId.mockResolvedValue('Siti Kasir');
  noteRepo.create.mockImplementation(async (d) => d);

  const n = await createNote('c1', { note: 'x' }, { userId: 'u1', fallback: 'kasir@niahair.com' });
  expect(n.createdBy).toBe('Siti Kasir');
});

test('createNote memakai fallback bila akun tanpa nama', async () => {
  customerRepo.findById.mockResolvedValue({ id: 'c1' });
  noteRepo.findAuthorNameByUserId.mockResolvedValue(null);
  noteRepo.create.mockImplementation(async (d) => d);

  const n = await createNote('c1', { note: 'x' }, { userId: 'u1', fallback: 'kasir@niahair.com' });
  expect(n.createdBy).toBe('kasir@niahair.com');
});

test('getNotes: catatan lama berisi email ditampilkan dengan nama karyawan', async () => {
  customerRepo.findById.mockResolvedValue({ id: 'c1' });
  noteRepo.findAllByCustomer.mockResolvedValue([
    { id: 'n1', createdBy: 'Kasir@NiaHair.com' },
    { id: 'n2', createdBy: 'Budi' },
    { id: 'n3', createdBy: 'lain@x.com' },
  ]);
  noteRepo.findAuthorNamesByEmails.mockResolvedValue({ 'kasir@niahair.com': 'Siti Kasir' });

  const notes = await getNotes('c1');
  expect(notes.map((n) => n.createdBy)).toEqual(['Siti Kasir', 'Budi', 'lain@x.com']);
  expect(noteRepo.findAuthorNamesByEmails).toHaveBeenCalledWith(['kasir@niahair.com', 'lain@x.com']);
});
