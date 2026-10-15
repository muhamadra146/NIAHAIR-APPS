'use strict';

// Regression: G1-07 — deposit yang diterapkan (POST /invoices/:id/deposits) SETELAH invoice pertama kali
// tersinkron tidak pernah dikirim ke Accurate, sehingga pembayaran berikutnya ditolak
// "Pembayaran faktur ... melebihi nilai piutang fakturnya".
// Found by /qa on 2026-10-15

jest.mock('./invoice.sync.repository', () => ({
  findInvoiceForSync: jest.fn(), markInvoiceSynced: jest.fn(), markInvoiceItemSynced: jest.fn(),
}));
jest.mock('../inventory/inventory.repository', () => ({ findWarehouseByBranchId: jest.fn() }));
jest.mock('../branch/branch.repository', () => ({ getAccurateBranchId: jest.fn().mockResolvedValue(null) }));
jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));

const syncRepo = require('./invoice.sync.repository');
const { accurateRequest } = require('../accurate/accurate.client');
const { syncInvoiceToAccurate } = require('./invoice.sync.service');
const { mapInvoiceToAccurate }  = require('./invoice.sync.mapper');

const invoice = (accurateInvoiceId) => ({
  id: 'inv1', invoiceNo: 'INV-1', invoiceDate: new Date('2026-10-15T03:00:00Z'), branchId: 'b1',
  status: 'PARTIAL', accurateInvoiceId, taxable: false, inclusiveTax: false,
  customer: { customerNo: 'C-1', accurateCustomerId: 1 },
  items: [],
  treatmentSessions: [],
  invoiceDeposits: [
    { amountApplied: '100000', deposit: { id: 'd1', accurateDepositId: 501, accurateDepositNumber: 'DP-1' } },
    { amountApplied: '50000',  deposit: { id: 'd2', accurateDepositId: 502, accurateDepositNumber: 'DP-2' } },
  ],
});

beforeEach(() => jest.clearAllMocks());

describe('mapper', () => {
  test('CREATE mengirim semua DP', () => {
    const p = mapInvoiceToAccurate(invoice(null), null);
    expect(p.detailDownPayment).toEqual([
      { invoiceId: 501, paymentAmount: 100000 },
      { invoiceId: 502, paymentAmount: 50000 },
    ]);
  });

  test('UPDATE hanya mengirim DP yang belum terpasang di Accurate', () => {
    const p = mapInvoiceToAccurate(invoice(900), null, 900, [], null, [501]);
    expect(p.detailDownPayment).toEqual([{ invoiceId: 502, paymentAmount: 50000 }]);
  });

  test('UPDATE tanpa info DP Accurate → DP tidak dikirim ulang (hindari double-apply)', () => {
    const p = mapInvoiceToAccurate(invoice(900), null, 900, [], null, null);
    expect(p.detailDownPayment).toBeUndefined();
  });
});

test('sync UPDATE menyertakan deposit yang diterapkan setelah sync pertama', async () => {
  syncRepo.findInvoiceForSync.mockResolvedValue(invoice(900));
  accurateRequest
    // baca faktur saat ini — DP 501 sudah terpasang
    .mockResolvedValueOnce({ s: true, r: { id: 900, detailItem: [], detailDownPayment: [{ id: 1, invoiceId: 501, paymentAmount: 100000 }] } })
    .mockResolvedValueOnce({ s: true, r: { id: 900, number: 'SI-1', detailItem: [] } });

  await syncInvoiceToAccurate('inv1');

  const payload = accurateRequest.mock.calls[1][1].body;
  expect(payload.detailDownPayment).toEqual([{ invoiceId: 502, paymentAmount: 50000 }]);
});

test('respons save tanpa detailDownPayment → baca detail.do (read-only) sebagai cadangan', async () => {
  syncRepo.findInvoiceForSync.mockResolvedValue(invoice(900));
  accurateRequest
    .mockResolvedValueOnce({ s: true, r: { id: 900, detailItem: [] } })
    .mockResolvedValueOnce({ s: true, d: { detailDownPayment: [{ invoiceId: 501 }, { invoice: { id: 502 } }] } })
    .mockResolvedValueOnce({ s: true, r: { id: 900, number: 'SI-1', detailItem: [] } });

  await syncInvoiceToAccurate('inv1');

  expect(accurateRequest.mock.calls[1][0]).toBe('/sales-invoice/detail.do?id=900');
  expect(accurateRequest.mock.calls[2][1].body.detailDownPayment).toBeUndefined();
});
