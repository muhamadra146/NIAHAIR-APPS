'use strict';

// Regression: QA Data menu 2026-10-18 — B3: push berhenti bila accurateCustomerId sudah ada
// (perubahan tidak pernah sampai ke Accurate); B5: pesan penolakan Accurate (array) tidak tersimpan.

jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('./customer.repository', () => ({ findById: jest.fn() }));
jest.mock('./customer.push.repository', () => ({
  updateAfterPush: jest.fn(),
  markSyncFailed: jest.fn(),
  findCustomersMissingCustomerNo: jest.fn(),
  findFailedSyncs: jest.fn(),
}));
jest.mock('../../utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

const { accurateRequest } = require('../accurate/accurate.client');
const { findById } = require('./customer.repository');
const pushRepo = require('./customer.push.repository');
const { pushCustomerToAccurate, accurateErrorMessage } = require('./customer.push.service');

beforeEach(() => jest.clearAllMocks());

const SYNCED = { id: 'c1', accurateCustomerId: 40950, customerNo: 'C.05048', name: 'Baru', mobilePhone: '6281', email: null, address: 'Jl', city: null, province: null, notes: null };

test('pelanggan yang sudah di Accurate → save.do dengan id (ubah), nomor tidak diganti', async () => {
  findById.mockResolvedValue(SYNCED);
  accurateRequest.mockResolvedValue({ s: true, r: { id: 40950, customerNo: 'C.99999' } });

  const r = await pushCustomerToAccurate('c1');

  expect(accurateRequest).toHaveBeenCalledWith('/customer/save.do', expect.objectContaining({
    method: 'POST',
    body:   expect.objectContaining({ id: 40950, name: 'Baru', email: '', billStreet: 'Jl' }),
  }));
  expect(pushRepo.updateAfterPush).toHaveBeenCalledWith('c1', { accurateCustomerId: 40950, customerNo: null });
  expect(r).toMatchObject({ updated: true, customerNo: 'C.05048' });
});

test('Accurate menolak dengan array pesan → pesan disimpan di syncError', async () => {
  findById.mockResolvedValue(SYNCED);
  accurateRequest.mockResolvedValue({ s: false, d: ['Data huruf terlalu besar. Maksimal 255'] });

  await expect(pushCustomerToAccurate('c1')).rejects.toMatchObject({ statusCode: 502, message: 'Data huruf terlalu besar. Maksimal 255' });
  expect(pushRepo.markSyncFailed).toHaveBeenCalledWith('c1', 'Data huruf terlalu besar. Maksimal 255');
});

test('accurateErrorMessage: string, array, objek, kosong', () => {
  expect(accurateErrorMessage({ d: 'x' })).toBe('x');
  expect(accurateErrorMessage({ d: ['a', 'b'] })).toBe('a; b');
  expect(accurateErrorMessage({ d: { k: 1 } })).toBe('{"k":1}');
  expect(accurateErrorMessage({})).toBe('Accurate menolak data pelanggan');
});
