'use strict';

// Tarif & PTKP PPh 21 bisa diubah di aplikasi (PAY-037)
jest.mock('./taxSetting.repository');
const repo = require('./taxSetting.repository');
const svc  = require('./taxSetting.service');

const VALID = {
  year: 2027, ptkpSelf: 54000000, ptkpMarried: 4500000, ptkpDependent: 4500000, maxDependents: 3,
  positionCostPercent: 5, positionCostMonthlyMax: 500000,
  pasal17Brackets: [{ upTo: 60000000, rate: 5 }, { upTo: null, rate: 35 }],
  terA: [{ upTo: 5400000, rate: 0 }, { upTo: null, rate: 34 }],
  terB: [{ upTo: 6200000, rate: 0 }, { upTo: null, rate: 34 }],
  terC: [{ upTo: 6600000, rate: 0 }, { upTo: null, rate: 34 }],
};

beforeEach(() => jest.clearAllMocks());

describe('create', () => {
  test('tahun baru tersimpan', async () => {
    repo.findByYear.mockResolvedValue(null);
    repo.create.mockImplementation((d) => ({ id: 't1', ...d }));
    const r = await svc.create(VALID);
    expect(r).toMatchObject({ id: 't1', year: 2027, ptkpSelf: 54000000 });
  });

  test('tahun yang sudah ada → 409', async () => {
    repo.findByYear.mockResolvedValue({ id: 'x', year: 2027 });
    await expect(svc.create(VALID)).rejects.toMatchObject({ statusCode: 409 });
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe('update', () => {
  test('tidak ditemukan → 404', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.update('x', VALID)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('ganti tahun ke tahun lain yang sudah ada → 409', async () => {
    repo.findById.mockResolvedValue({ id: 't1', year: 2026 });
    repo.findByYear.mockResolvedValue({ id: 't2', year: 2027 });
    await expect(svc.update('t1', VALID)).rejects.toMatchObject({ statusCode: 409 });
  });

  test('PTKP baru tersimpan', async () => {
    repo.findById.mockResolvedValue({ id: 't1', year: 2027 });
    repo.update.mockImplementation((id, d) => ({ id, ...d }));
    const r = await svc.update('t1', { ...VALID, ptkpSelf: 60000000 });
    expect(r.ptkpSelf).toBe(60000000);
  });
});

describe('tabel tarif harus urut', () => {
  test.each([
    ['baris terakhir punya batas', { terA: [{ upTo: 5400000, rate: 0 }, { upTo: 6000000, rate: 1 }] }, 'baris terakhir'],
    ['batas kosong di tengah', { terA: [{ upTo: null, rate: 0 }, { upTo: null, rate: 1 }] }, 'baris 1'],
    ['batas tidak naik', { terB: [{ upTo: 6200000, rate: 0 }, { upTo: 6200000, rate: 1 }, { upTo: null, rate: 2 }] }, 'baris 2'],
    ['tarif turun', { pasal17Brackets: [{ upTo: 60000000, rate: 15 }, { upTo: null, rate: 5 }] }, 'tarif tidak boleh'],
  ])('%s → 422', async (_, patch, msg) => {
    repo.findByYear.mockResolvedValue(null);
    await expect(svc.create({ ...VALID, ...patch })).rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining(msg) });
    expect(repo.create).not.toHaveBeenCalled();
  });
});
