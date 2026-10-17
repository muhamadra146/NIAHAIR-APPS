'use strict';

// Regression (QA POS 2026-10-17):
//   P4  — baris ber-PPN dengan item yang di master Accurate tidak punya pajak: Accurate diam-diam
//         tidak memungut PPN → total faktur kurang → pembayaran ditolak "melebihi nilai piutang".
//         Sync dihentikan dengan pesan jelas (diverifikasi live: OMBRE / BALAYAGE 100928).
//   R2a — role INVENTORY bisa membaca semua invoice & pembayaran lewat API.
// Found by /qa on 2026-10-17

jest.mock('./invoice.sync.repository', () => ({
  findInvoiceForSync: jest.fn(), markInvoiceSynced: jest.fn(), markInvoiceItemSynced: jest.fn(),
}));
jest.mock('../inventory/inventory.repository', () => ({ findWarehouseByBranchId: jest.fn() }));
jest.mock('../branch/branch.repository', () => ({ getAccurateBranchId: jest.fn().mockResolvedValue(null) }));
jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('../../middlewares/role.middleware', () => jest.fn((...roles) => {
  const mw = (req, res, next) => next();
  mw.roles = roles;
  return mw;
}));
jest.mock('./invoice.controller', () => new Proxy({}, { get: () => (req, res) => res.end() }));
jest.mock('../payment/payment.controller', () => new Proxy({}, { get: () => (req, res) => res.end() }));

const syncRepo = require('./invoice.sync.repository');
const { accurateRequest } = require('../accurate/accurate.client');
const { syncInvoiceToAccurate } = require('./invoice.sync.service');

const line = (code, accId, extra = {}) => ({
  id: code, qty: 1, price: 700000, subtotal: 700000, discount: 0, discountType: 'AMOUNT', taxable: true, isMaterial: false, lineGroup: null,
  item: { itemCode: code, accurateItemId: accId, itemType: 'SERVICE' }, unit: { name: 'PCS', accurateUnitId: 1 }, ...extra,
});
const invoice = (items, over = {}) => ({
  id: 'inv1', invoiceNo: 'INV-1', invoiceDate: new Date('2026-10-17T03:00:00Z'), branchId: 'b1', status: 'UNPAID',
  accurateInvoiceId: null, taxable: true, inclusiveTax: false, subtotal: 700000, totalTax: 77000, grandTotal: 777000,
  customer: { customerNo: 'C-1', accurateCustomerId: 1 }, items, treatmentSessions: [], invoiceDeposits: [], ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('P4 — PPN butuh pajak di master item Accurate', () => {
  test('item tanpa PPN di Accurate → sync berhenti dengan pesan jelas, faktur tidak disimpan', async () => {
    syncRepo.findInvoiceForSync.mockResolvedValue(invoice([line('100928', 9001)]));
    accurateRequest.mockResolvedValueOnce({ s: true, d: { id: 9001, name: 'OMBRE / BALAYAGE', tax1Id: null } });

    await expect(syncInvoiceToAccurate('inv1')).rejects.toThrow(
      'PPN belum diatur di master item Accurate: 100928 OMBRE / BALAYAGE',
    );
    expect(accurateRequest).toHaveBeenCalledTimes(1);
    expect(accurateRequest.mock.calls[0][0]).toBe('/item/detail.do?id=9001');
    expect(syncRepo.markInvoiceSynced).not.toHaveBeenCalled();
  });

  test('item ber-PPN → payload membawa useTax1 & harga asli, faktur disimpan', async () => {
    syncRepo.findInvoiceForSync.mockResolvedValue(invoice([line('100925', 9002)]));
    accurateRequest
      .mockResolvedValueOnce({ s: true, d: { id: 9002, tax1Id: 50 } })
      .mockResolvedValueOnce({ s: true, r: { id: 777, number: 'SI-1', detailItem: [{ id: 1 }] } });

    await syncInvoiceToAccurate('inv1');

    const payload = accurateRequest.mock.calls[1][1].body;
    expect(payload.detailItem[0]).toMatchObject({ itemNo: '100925', unitPrice: 700000, useTax1: true });
    expect(syncRepo.markInvoiceSynced).toHaveBeenCalled();
  });

  test('invoice tanpa PPN → tidak ada pengecekan master item', async () => {
    syncRepo.findInvoiceForSync.mockResolvedValue(invoice([line('100928', 9001, { taxable: false })], { taxable: false }));
    accurateRequest.mockResolvedValueOnce({ s: true, r: { id: 778, number: 'SI-2', detailItem: [] } });

    await syncInvoiceToAccurate('inv1');
    expect(accurateRequest).toHaveBeenCalledTimes(1);
    expect(accurateRequest.mock.calls[0][0]).toBe('/sales-invoice/save.do');
  });
});

describe('R2a — baca invoice & pembayaran dibatasi per role', () => {
  const rolesFor = (router, method, path) => {
    const layer = router.stack.find((l) => l.route?.path === path && l.route.methods[method]);
    return layer.route.stack.map((s) => s.handle.roles).find(Boolean) ?? null;
  };

  test('GET /invoices & /invoices/:id: tanpa INVENTORY, tetap untuk POS/Finance/Office/Staf operasional', () => {
    const router = require('./invoice.route');
    for (const path of ['/', '/:id']) {
      const roles = rolesFor(router, 'get', path);
      expect(roles).not.toContain('INVENTORY');
      expect(roles).toEqual(expect.arrayContaining(['SUPER_ADMIN', 'OWNER', 'MANAGER', 'CASHIER', 'FINANCE', 'OFFICE', 'STAFF_OPERASIONAL']));
    }
  });

  test('GET pembayaran: hanya POS + Finance', () => {
    const router = require('../payment/payment.route');
    for (const path of ['/', '/:id', '/summary']) {
      expect(rolesFor(router, 'get', path).sort()).toEqual(['CASHIER', 'FINANCE', 'MANAGER', 'OWNER', 'SUPER_ADMIN']);
    }
  });
});
