'use strict';

// Regression: QA Kehadiran (2026-10-19) — tanggal mustahil (2026-02-30) digeser diam-diam
// menjadi 2 Mar di cuti / izin / sakit / jadwal massal / hari libur. Sekarang ditolak 400.

jest.mock('../modules/holiday/holiday.repository');
jest.mock('../modules/shift/shift.repository');

const { toDateOnly, toDateStr, isValidDateStr, addDaysDateOnly, wibDayStart } = require('./date');
const holidayRepo = require('../modules/holiday/holiday.repository');
const shiftRepo   = require('../modules/shift/shift.repository');
const holidaySvc  = require('../modules/holiday/holiday.service');
const shiftSvc    = require('../modules/shift/shift.service');

beforeEach(() => jest.clearAllMocks());

describe('isValidDateStr', () => {
  test.each(['2026-02-28', '2028-02-29', '2026-12-31'])('%s valid', (s) => expect(isValidDateStr(s)).toBe(true));
  test.each(['2026-02-29', '2026-02-30', '2026-04-31', '2026-13-01', '2026-00-10', '2026-2-3', 'abc', '', null])(
    '%s tidak valid', (s) => expect(isValidDateStr(s)).toBe(false));
});

describe('toDateOnly / toDateStr (ketat)', () => {
  test.each(['2026-02-30', '2026-02-30T05:00:00Z', 'bukan-tanggal'])('"%s" → AppError 400 "Tanggal tidak valid"', (v) => {
    expect(() => toDateOnly(v)).toThrow(expect.objectContaining({ statusCode: 400, message: 'Tanggal tidak valid' }));
    expect(() => wibDayStart(v)).toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  test('perilaku lama tetap: string tanggal, ISO ber-jam (dibaca WIB), Date, default = hari ini', () => {
    expect(toDateOnly('2026-11-05').toISOString()).toBe('2026-11-05T00:00:00.000Z');
    expect(toDateStr('2026-10-19T20:00:00Z')).toBe('2026-10-20'); // 03:00 WIB tgl 20
    expect(toDateOnly(new Date('2026-10-19T16:59:00Z')).toISOString()).toBe('2026-10-19T00:00:00.000Z');
    expect(toDateStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('addDaysDateOnly melintasi bulan', () => {
    expect(addDaysDateOnly('2026-03-01', -1).toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });
});

describe('hari libur', () => {
  test('tanggal mustahil → 400, tidak tersimpan', async () => {
    await expect(holidaySvc.create({ date: '2026-02-30', name: 'X' })).rejects.toMatchObject({ statusCode: 400 });
    expect(holidayRepo.create).not.toHaveBeenCalled();
  });

  test('tanggal valid disimpan apa adanya (00:00 UTC)', async () => {
    holidayRepo.findByDate.mockResolvedValue(null);
    holidayRepo.create.mockResolvedValue({});
    await holidaySvc.create({ date: '2026-12-25', name: 'Natal' });
    expect(holidayRepo.create).toHaveBeenCalledWith({ date: new Date('2026-12-25T00:00:00.000Z'), name: 'Natal', year: 2026 });
  });
});

describe('shift: jam pulang harus setelah jam masuk', () => {
  beforeEach(() => {
    shiftRepo.findByCode.mockResolvedValue(null);
    shiftRepo.create.mockImplementation(async (data) => data);
  });

  test.each([['18:00', '09:00'], ['09:00', '09:00'], ['22:00', '06:00']])('%s – %s ditolak 422', async (s, e) => {
    await expect(shiftSvc.createShift({ code: 'X', name: 'X', startTime: s, endTime: e })).rejects.toMatchObject({ statusCode: 422 });
  });

  test('09:00 – 18:00 dan shift tanpa jam (OFF) diterima', async () => {
    await expect(shiftSvc.createShift({ code: 'S', name: 'S', startTime: '09:00', endTime: '18:00' })).resolves.toBeTruthy();
    await expect(shiftSvc.createShift({ code: 'OFF', name: 'Libur', startTime: '', endTime: '', isWorking: false })).resolves.toBeTruthy();
  });

  test('update: jam baru dibandingkan dengan jam yang tersimpan', async () => {
    shiftRepo.findById.mockResolvedValue({ id: 'sh1', code: 'S', startTime: '09:00', endTime: '18:00' });
    shiftRepo.isShiftUsed.mockResolvedValue(false);
    await expect(shiftSvc.updateShift('sh1', { endTime: '08:00' })).rejects.toMatchObject({ statusCode: 422 });
  });

  test('pesan shift terpakai berbahasa Indonesia', async () => {
    shiftRepo.findById.mockResolvedValue({ id: 'sh1', code: 'S', startTime: '09:00', endTime: '18:00' });
    shiftRepo.isShiftUsed.mockResolvedValue(true);
    await expect(shiftSvc.updateShift('sh1', { startTime: '10:00' })).rejects.toMatchObject({
      statusCode: 422, message: expect.stringContaining('tidak bisa diubah'),
    });
  });
});
