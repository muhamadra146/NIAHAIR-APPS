'use strict';

// Regression: G1-27 — PUT /treatment-sessions/:id: completedAt sebelum startedAt diterima;
// completedAt:null ditolak validasi padahal service mendukung batal-selesai.
// Found by /qa on 2026-10-15

jest.mock('./treatment.repository');
jest.mock('../invoice/invoice.sync.service', () => ({ syncInvoiceToAccurate: jest.fn().mockResolvedValue() }));
jest.mock('../../config/prisma', () => ({ invoice: { findUnique: jest.fn().mockResolvedValue({ accurateInvoiceId: null }) } }));

const v    = require('valibot');
const repo = require('./treatment.repository');
const svc  = require('./treatment.service');
const { updateSessionSchema } = require('./treatment.validation');

const SESSION = { id: 'ts1', startedAt: new Date('2026-10-15T03:00:00Z'), completedAt: null, invoiceId: null };

beforeEach(() => {
  jest.clearAllMocks();
  repo.findById.mockResolvedValue(SESSION);
  repo.update.mockResolvedValue(SESSION);
});

test('completedAt sebelum startedAt → 422', async () => {
  await expect(svc.updateSession('ts1', { completedAt: '2026-10-15T02:00:00Z' }))
    .rejects.toMatchObject({ statusCode: 422, message: 'Waktu selesai tidak boleh sebelum waktu mulai' });
  expect(repo.update).not.toHaveBeenCalled();
});

test('completedAt setelah startedAt → diterima', async () => {
  await svc.updateSession('ts1', { completedAt: '2026-10-15T05:00:00Z' });
  expect(repo.update).toHaveBeenCalled();
});

test('skema menerima completedAt: null (batal selesai)', () => {
  expect(v.safeParse(updateSessionSchema, { completedAt: null }).success).toBe(true);
});

test('completedAt: null diteruskan ke service sebagai batal selesai', async () => {
  repo.findById.mockResolvedValue({ ...SESSION, completedAt: new Date('2026-10-15T05:00:00Z') });
  await svc.updateSession('ts1', { completedAt: null });
  expect(repo.update).toHaveBeenCalledWith('ts1', { completedAt: null });
});
