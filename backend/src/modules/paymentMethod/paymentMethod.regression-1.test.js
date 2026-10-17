'use strict';

// Regression G5-13, G5-14 — found by API QA 2026-10-15
jest.mock('./paymentMethod.repository');

const { safeParse } = require('valibot');
const repo = require('./paymentMethod.repository');
const svc  = require('./paymentMethod.service');
const { updatePaymentMethodSchema, createPaymentMethodSchema } = require('./paymentMethod.validation');

const PM = { id: 'pm1', code: 'QRIS', name: 'QRIS', isActive: true, cashAccountId: 'ca1' };

beforeEach(() => {
  jest.clearAllMocks();
  repo.findById.mockResolvedValue(PM);
  repo.findByCode.mockResolvedValue(null);
  repo.create.mockImplementation(async (d) => d);
  repo.update.mockImplementation(async (id, d) => ({ id, ...d }));
});

describe('G5-13 lepas tautan akun kas', () => {
  test('skema menerima cashAccountId null', () => {
    expect(safeParse(updatePaymentMethodSchema, { cashAccountId: null }).success).toBe(true);
    expect(safeParse(createPaymentMethodSchema, { code: 'A', name: 'A', cashAccountId: null }).success).toBe(true);
  });

  test('service menyimpan null', async () => {
    await svc.updatePaymentMethod('pm1', { cashAccountId: null });
    expect(repo.update).toHaveBeenCalledWith('pm1', { cashAccountId: null });
    expect(repo.findCashAccountById).not.toHaveBeenCalled();
  });
});

describe('G5-14 akun kas nonaktif ditolak', () => {
  test('update ke akun kas nonaktif → 422', async () => {
    repo.findCashAccountById.mockResolvedValue({ id: 'ca2', name: 'Kas Lama', isActive: false });
    await expect(svc.updatePaymentMethod('pm1', { cashAccountId: 'ca2' })).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.update).not.toHaveBeenCalled();
  });

  test('create dengan akun kas tidak ada → 404', async () => {
    repo.findCashAccountById.mockResolvedValue(null);
    await expect(svc.createPaymentMethod({ code: 'x', name: 'X', cashAccountId: 'nope' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('akun kas aktif → ditautkan', async () => {
    repo.findCashAccountById.mockResolvedValue({ id: 'ca3', name: 'Kas', isActive: true });
    await svc.updatePaymentMethod('pm1', { cashAccountId: 'ca3' });
    expect(repo.update).toHaveBeenCalledWith('pm1', { cashAccountId: 'ca3' });
  });
});
