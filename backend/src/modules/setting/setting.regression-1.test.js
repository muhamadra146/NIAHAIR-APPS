'use strict';

// Regression G5-15, G5-16b — found by API QA 2026-10-15
jest.mock('../../config/prisma', () => ({ setting: { upsert: jest.fn() } }));

const prisma = require('../../config/prisma');
const svc    = require('./setting.service');

beforeEach(() => jest.clearAllMocks());

describe('G5-16b nama kunci', () => {
  test.each(['ada spasi', 'UPPER', 'a'.repeat(81), 'titik.key', ''])('%p → 400', async (key) => {
    await expect(svc.upsertSetting(key, { value: '1' })).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.setting.upsert).not.toHaveBeenCalled();
  });

  test('kunci valid diterima', async () => {
    await svc.upsertSetting('finance_ongkos_pp_item_codes', { value: '[]' });
    expect(prisma.setting.upsert).toHaveBeenCalled();
  });
});

describe('G5-15 description ikut diperbarui', () => {
  test('description dikirim → update memuatnya', async () => {
    await svc.upsertSetting('qa_key', { value: 'x', description: 'Baru' });
    expect(prisma.setting.upsert.mock.calls[0][0].update).toEqual({ value: 'x', description: 'Baru' });
  });

  test('description tidak dikirim → tidak diubah', async () => {
    await svc.upsertSetting('qa_key', { value: 'x' });
    expect(prisma.setting.upsert.mock.calls[0][0].update).toEqual({ value: 'x' });
  });
});
