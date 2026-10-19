// Regression: B1 — PPN faktur pembelian tidak terkirim ke Accurate (total Accurate ≠ ERP), PPN tidak dibulatkan
// Regression: B6 — batal faktur menghapus di Accurate SEBELUM guard status (batal paralel → Accurate terhapus, 409 telat)
// Regression: UX — tanggal faktur di masa depan & baris item ganda diterima
// Found by /qa on 2026-10-18
'use strict';

jest.mock('./purchase.repository');
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn().mockResolvedValue({}) }));
jest.mock('../../workers/accurateSync.worker', () => ({ processSyncQueue: jest.fn().mockResolvedValue({}) }));
jest.mock('../inventory/inventory.period.service');
jest.mock('../branch/branch.repository', () => ({ getAccurateBranchId: jest.fn().mockResolvedValue(null) }));
jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('../../config/prisma', () => ({
  item:            { findMany: jest.fn() },
  purchaseReturn:  { count: jest.fn().mockResolvedValue(0) },
  purchaseInvoice: { findUnique: jest.fn(), update: jest.fn() },
  purchaseInvoiceItem: { update: jest.fn().mockResolvedValue({}) },
  $transaction:    jest.fn(),
}));

const repo   = require('./purchase.repository');
const prisma = require('../../config/prisma');
const { accurateRequest } = require('../accurate/accurate.client');
const svc    = require('./purchase.service');
const { mapPurchaseInvoiceToAccurate } = require('./purchase.sync.mapper');
const { pushPurchaseInvoiceToAccurate } = require('./purchase.accurate.sync.service');
const { wibDateStr } = require('../../utils/date');

beforeEach(() => jest.clearAllMocks());

const syncInvoice = (taxable) => ({
  id: 'pi1', invoiceNo: 'PI-1', status: 'POSTED', taxable, inclusiveTax: false, invoiceDate: '2026-10-18',
  supplier: { name: 'S', accurateVendorId: 9 }, warehouse: { branchId: null },
  items: [
    { id: 'l1', qty: '3', price: '33333', discount: '0', item: { itemCode: 'A', itemType: 'INVENTORY', accurateItemId: 15300 }, unit: { accurateUnitId: 601 } },
    { id: 'l2', qty: '1', price: '1000',  discount: '5', item: { itemCode: 'B', itemType: 'INVENTORY', accurateItemId: 15350 }, unit: { accurateUnitId: 601 } },
  ],
});

describe('mapper', () => {
  test('faktur ber-PPN → setiap baris useTax1 + tax1Name PPN (seperti faktur penjualan)', () => {
    const p = mapPurchaseInvoiceToAccurate(syncInvoice(true), 'PI-1');
    expect(p.taxable).toBe(true);
    expect(p.detailItem.every((d) => d.useTax1 === true && d.tax1Name === 'PPN')).toBe(true);
  });
  test('faktur tanpa PPN → tidak ada useTax1', () => {
    const p = mapPurchaseInvoiceToAccurate(syncInvoice(false), 'PI-1');
    expect(p.detailItem.some((d) => 'useTax1' in d)).toBe(false);
  });
});

describe('sync', () => {
  test('master item Accurate tanpa PPN → 422 berbahasa Indonesia, faktur tidak dikirim', async () => {
    prisma.purchaseInvoice.findUnique.mockResolvedValue(syncInvoice(true));
    accurateRequest.mockImplementation((ep) => Promise.resolve(
      ep.includes('15300') ? { s: true, d: { name: 'Bahan A', tax1Id: 50 } } : { s: true, d: { name: 'Bahan B', tax1Id: null } }));
    await expect(pushPurchaseInvoiceToAccurate('pi1')).rejects.toMatchObject({
      statusCode: 422, message: expect.stringContaining('PPN belum diatur di master item Accurate: B Bahan B'),
    });
    expect(accurateRequest.mock.calls.some(([ep]) => ep === '/purchase-invoice/save.do')).toBe(false);
  });

  test('semua item ber-PPN → faktur dikirim dengan useTax1', async () => {
    prisma.purchaseInvoice.findUnique.mockResolvedValue(syncInvoice(true));
    accurateRequest.mockImplementation((ep) => Promise.resolve(ep.startsWith('/item/detail.do')
      ? { s: true, d: { tax1Id: 50 } } : { s: true, r: { id: 77, number: 'PI.1', detailItem: [] } }));
    await expect(pushPurchaseInvoiceToAccurate('pi1')).resolves.toMatchObject({ synced: true, accuratePurchaseInvoiceId: 77 });
    const save = accurateRequest.mock.calls.find(([ep]) => ep === '/purchase-invoice/save.do');
    expect(save[1].body.detailItem[0].useTax1).toBe(true);
  });
});

describe('create', () => {
  const tx = () => ({
    purchaseInvoice:   { create: jest.fn((args) => Promise.resolve({ ...args.data, id: 'pi1', invoiceNo: 'PI-1', items: [] })) },
  });
  beforeEach(() => {
    repo.findMaxPurchaseSeqToday.mockResolvedValue(0);
    prisma.item.findMany.mockResolvedValue([
      { id: 'i1', name: 'A', defaultUnitId: 'u1', purchaseUnitId: null, itemUnits: [] },
      { id: 'i2', name: 'B', defaultUnitId: 'u1', purchaseUnitId: null, itemUnits: [] },
    ]);
  });

  test('PPN exclusive dibulatkan ke rupiah penuh per dokumen (sama dengan Accurate)', async () => {
    const t = tx();
    prisma.$transaction.mockImplementation((fn) => fn(t));
    // dasar = 3 × 33.333 + 1.000 × 95% = 100.949 → PPN 11% = 11.104,39 → 11.104
    await svc.createPurchaseInvoice({
      supplierId: 's1', warehouseId: 'wh1', invoiceDate: '2026-10-18', taxable: true,
      items: [{ itemId: 'i1', unitId: 'u1', qty: 3, price: 33333 }, { itemId: 'i2', unitId: 'u1', qty: 1, price: 1000, discount: 5 }],
    });
    const data = t.purchaseInvoice.create.mock.calls[0][0].data;
    expect(data.totalTax.toString()).toBe('11104');
    expect(data.grandTotal.toString()).toBe('112053');
  });

  test('PPN inclusive: PPN = bulat(dasar × 11/111), total = dasar', async () => {
    const t = tx();
    prisma.$transaction.mockImplementation((fn) => fn(t));
    await svc.createPurchaseInvoice({
      supplierId: 's1', warehouseId: 'wh1', invoiceDate: '2026-10-18', taxable: true, inclusiveTax: true,
      items: [{ itemId: 'i1', unitId: 'u1', qty: 1, price: 100000 }],
    });
    const data = t.purchaseInvoice.create.mock.calls[0][0].data;
    expect(data.totalTax.toString()).toBe('9910');
    expect(data.grandTotal.toString()).toBe('100000');
  });

  test('tanggal faktur di masa depan → 422', async () => {
    const future = wibDateStr(new Date(Date.now() + 3 * 86400000));
    await expect(svc.createPurchaseInvoice({
      supplierId: 's1', warehouseId: 'wh1', invoiceDate: future,
      items: [{ itemId: 'i1', unitId: 'u1', qty: 1, price: 1 }],
    })).rejects.toMatchObject({ statusCode: 422, message: 'Tanggal faktur tidak boleh melebihi hari ini' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('item + satuan yang sama dua kali → 422', async () => {
    await expect(svc.createPurchaseInvoice({
      supplierId: 's1', warehouseId: 'wh1', invoiceDate: '2026-10-18',
      items: [{ itemId: 'i1', unitId: 'u1', qty: 1, price: 1 }, { itemId: 'i1', unitId: 'u1', qty: 2, price: 1 }],
    })).rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining('lebih dari sekali') });
  });
});

describe('cancel — guard status sebelum Accurate (B6)', () => {
  const INVOICE = {
    id: 'pi1', invoiceNo: 'PI-1', status: 'POSTED', warehouseId: 'wh1', invoiceDate: '2026-10-15',
    accuratePurchaseInvoiceId: 123, items: [],
  };
  beforeEach(() => repo.findPurchaseInvoiceById.mockResolvedValue(INVOICE));

  test('batal paralel (status sudah berubah) → 409 dan Accurate TIDAK dipanggil', async () => {
    const t = { purchaseInvoice: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) } };
    prisma.$transaction.mockImplementation((fn) => fn(t));
    await expect(svc.cancelPurchaseInvoice('pi1')).rejects.toMatchObject({ statusCode: 409, message: 'Dokumen sudah diproses' });
    expect(accurateRequest).not.toHaveBeenCalled();
  });

  test('Accurate menolak void → error (transaksi ERP di-rollback)', async () => {
    const t = {
      purchaseInvoice: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({ accuratePurchaseInvoiceId: 123 }),
        update:     jest.fn(),
      },
      purchaseReturn: { count: jest.fn().mockResolvedValue(0) },
    };
    prisma.$transaction.mockImplementation((fn) => fn(t));
    accurateRequest.mockImplementation((ep) => Promise.resolve(ep.startsWith('/purchase-invoice/detail.do')
      ? { s: true, d: { id: 123 } } : { s: false, d: ['Sudah ada pembayaran'] }));
    await expect(svc.cancelPurchaseInvoice('pi1')).rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining('Sudah ada pembayaran') });
    expect(t.purchaseInvoice.update).not.toHaveBeenCalled();
  });

  test('dokumen sudah tidak ada di Accurate (percobaan sebelumnya terhenti) → batal tetap berhasil', async () => {
    const t = {
      purchaseInvoice: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({ accuratePurchaseInvoiceId: 123 }),
        update:     jest.fn(),
      },
      purchaseReturn: { count: jest.fn().mockResolvedValue(0) },
    };
    prisma.$transaction.mockImplementation((fn) => fn(t));
    accurateRequest.mockResolvedValue({ s: false, d: ['Data tidak ditemukan'] });
    await expect(svc.cancelPurchaseInvoice('pi1')).resolves.toMatchObject({ cancelled: true });
    expect(t.purchaseInvoice.update).toHaveBeenCalledWith({
      where: { id: 'pi1' }, data: { accuratePurchaseInvoiceId: null, accuratePurchaseInvoiceNumber: null },
    });
  });
});
